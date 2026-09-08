import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '../src/lib/db/client';
import { systemDb } from '../src/lib/db/system';
import { withTenant } from '../src/lib/db/withTenant';
import { TenantScopeViolationError, unsafeTenantContextForTests } from '../src/lib/tenant/context';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * Isolation multi-tenant — la suite bloquante de la CI (voir
 * docs/v1/lot-0-validation.md et docs/v1/lot-1-socle.md).
 *
 * Vérifie les deux couches indépendamment :
 *   1. filtrage applicatif (extension Prisma) ;
 *   2. Row Level Security PostgreSQL, y compris quand la couche 1 est contournée.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('Lecture', () => {
  it('A lit ses propres clients', async () => {
    const rows = await withTenant(ctxA(), (db) => db.client.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Client A');
  });

  it('A ne voit pas le client de B, même en le demandant par son identifiant', async () => {
    const direct = await withTenant(ctxA(), (db) => db.client.findUnique({ where: { id: f.clientB } }));
    expect(direct).toBeNull();

    const filtered = await withTenant(ctxA(), (db) => db.client.findMany({ where: { id: f.clientB } }));
    expect(filtered).toHaveLength(0);
  });

  it("A ne peut pas élargir sa vue en forçant un organizationId dans le where (silencieusement écrasé)", async () => {
    // Pour une lecture, l'extension écrase le organizationId demandé par celui
    // du contexte plutôt que de lever — sans risque (la lecture reste bornée
    // à l'organisation de A), contrairement à une écriture où l'intention
    // (créer/modifier ailleurs) doit être rejetée bruyamment.
    const rows = await withTenant(ctxA(), (db) => db.client.findMany({ where: { organizationId: f.orgB } }));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.organizationId).toBe(f.orgA);
  });
});

describe('Modification', () => {
  it('A modifie son propre client', async () => {
    const updated = await withTenant(ctxA(), (db) =>
      db.client.update({ where: { id: f.clientA }, data: { name: 'Client A modifié' } }),
    );
    expect(updated.name).toBe('Client A modifié');
  });

  it('A ne peut pas modifier le client de B', async () => {
    await expect(
      withTenant(ctxA(), (db) => db.client.update({ where: { id: f.clientB }, data: { name: 'piraté' } })),
    ).rejects.toThrow();

    const after = await systemDb.client.findUnique({ where: { id: f.clientB } });
    expect(after!.name).toBe('Client B');
  });

  it('un updateMany de A ne touche aucune ligne de B', async () => {
    const result = await withTenant(ctxA(), (db) => db.client.updateMany({ data: { name: 'écrasé' } }));
    expect(result.count).toBe(1);
    const b = await systemDb.client.findUnique({ where: { id: f.clientB } });
    expect(b!.name).toBe('Client B');
  });
});

describe('Suppression', () => {
  it('A supprime son propre client', async () => {
    await withTenant(ctxA(), (db) => db.client.delete({ where: { id: f.clientA } }));
    expect(await systemDb.client.count()).toBe(1);
  });

  it('A ne peut pas supprimer le client de B', async () => {
    await expect(
      withTenant(ctxA(), (db) => db.client.delete({ where: { id: f.clientB } })),
    ).rejects.toThrow();
    expect(await systemDb.client.findUnique({ where: { id: f.clientB } })).not.toBeNull();
  });

  it('un deleteMany de A ne supprime rien chez B', async () => {
    const result = await withTenant(ctxA(), (db) => db.client.deleteMany({}));
    expect(result.count).toBe(1);
    expect(await systemDb.client.findUnique({ where: { id: f.clientB } })).not.toBeNull();
  });
});

describe('Création', () => {
  it('A crée un client dans sa propre organisation', async () => {
    const created = await withTenant(ctxA(), (db) => db.client.create({ data: { name: 'Nouveau' } as never }));
    expect(created.organizationId).toBe(f.orgA);
  });

  it("A ne peut pas créer directement un client dans l'organisation de B", async () => {
    await expect(
      withTenant(ctxA(), (db) =>
        db.client.create({ data: { name: 'Injecté', organizationId: f.orgB } as never }),
      ),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
    expect(await systemDb.client.count({ where: { organizationId: f.orgB } })).toBe(1);
  });

  it("la RLS refuse une insertion brute visant l'organisation de B", async () => {
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO clients (id, organization_id, kind, name, status, created_at, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', 'individual', 'Injecté SQL', 'prospect', now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe('Absence de contexte tenant', () => {
  it('une requête sans contexte ne renvoie aucune donnée métier', async () => {
    const rows = await appDb.client.findMany();
    expect(rows).toHaveLength(0);
  });

  it('une écriture sans contexte est refusée par la RLS', async () => {
    await expect(
      appDb.client.create({ data: { organizationId: f.orgA, name: 'Sans contexte' } }),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe('Contournement du repository (SQL brut)', () => {
  it("la RLS filtre encore un SELECT brut sans clause de tenant", async () => {
    const rows = await withTenant(ctxA(), (db) =>
      db.$queryRawUnsafe<Array<{ name: string }>>('SELECT name FROM clients'),
    );
    expect(rows.map((r) => r.name)).toEqual(['Client A']);
  });

  it("la RLS filtre un UPDATE brut sans clause de tenant", async () => {
    await withTenant(ctxA(), (db) => db.$executeRawUnsafe(`UPDATE clients SET name = 'balayé'`));
    const b = await systemDb.client.findUnique({ where: { id: f.clientB } });
    expect(b!.name).toBe('Client B');
  });

  it("la RLS filtre un DELETE brut sans clause de tenant", async () => {
    await withTenant(ctxA(), (db) => db.$executeRawUnsafe('DELETE FROM clients'));
    expect(await systemDb.client.findUnique({ where: { id: f.clientB } })).not.toBeNull();
  });
});

describe('Contexte forgé', () => {
  it("un contexte { userA, orgB } (utilisateur non membre) est refusé par la RLS", async () => {
    const forged = unsafeTenantContextForTests(f.userA, f.orgB);
    await expect(
      withTenant(forged, (db) => db.client.findMany()),
    ).resolves.toHaveLength(0); // app_is_member() bloque : aucune ligne visible.

    await expect(
      withTenant(forged, (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO clients (id, organization_id, kind, name, status, created_at, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', 'individual', 'Forgé', 'prospect', now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
