import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appPrisma, systemPrisma } from '../src/db/client.js';
import { withTenant } from '../src/db/withTenant.js';
import { resolveTenantContext, fakeSession, listMemberships } from '../src/auth/session.js';
import { ForbiddenOrganizationError, TenantScopeViolationError, unsafeTenantContextForTests } from '../src/tenant/context.js';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers.js';

/**
 * SPIKE A — Isolation multi-tenant.
 *
 * Ces tests sont conçus pour devenir BLOQUANTS dans la CI de la V1.
 * Ils vérifient les deux couches indépendamment :
 *   1. filtrage applicatif (extension Prisma) ;
 *   2. Row Level Security PostgreSQL, y compris quand la couche 1 est contournée.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appPrisma.$disconnect(); await systemPrisma.$disconnect(); });

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

  it("A ne peut pas élargir sa vue en forçant un organizationId dans le where", async () => {
    // Tentative explicite de contournement applicatif : refus bruyant.
    await expect(
      withTenant(ctxA(), (db) => db.client.findMany({ where: { organizationId: f.orgB } })),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
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

    const after = await systemPrisma.client.findUnique({ where: { id: f.clientB } });
    expect(after!.name).toBe('Client B');
  });

  it('un updateMany de A ne touche aucune ligne de B', async () => {
    const result = await withTenant(ctxA(), (db) =>
      db.client.updateMany({ data: { name: 'écrasé' } }),
    );
    expect(result.count).toBe(1);
    const b = await systemPrisma.client.findUnique({ where: { id: f.clientB } });
    expect(b!.name).toBe('Client B');
  });
});

describe('Suppression', () => {
  it('A supprime son propre client', async () => {
    await withTenant(ctxA(), (db) => db.client.delete({ where: { id: f.clientA } }));
    expect(await systemPrisma.client.count()).toBe(1);
  });

  it('A ne peut pas supprimer le client de B', async () => {
    await expect(
      withTenant(ctxA(), (db) => db.client.delete({ where: { id: f.clientB } })),
    ).rejects.toThrow();
    expect(await systemPrisma.client.findUnique({ where: { id: f.clientB } })).not.toBeNull();
  });

  it('un deleteMany de A ne supprime rien chez B', async () => {
    const result = await withTenant(ctxA(), (db) => db.client.deleteMany({}));
    expect(result.count).toBe(1);
    expect(await systemPrisma.client.findUnique({ where: { id: f.clientB } })).not.toBeNull();
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
    // Aucune donnée n'a atterri chez B.
    expect(await systemPrisma.client.count({ where: { organizationId: f.orgB } })).toBe(1);
  });

  it("la RLS refuse une insertion brute visant l'organisation de B", async () => {
    // Contournement total de l'extension : SQL brut, organizationId de B.
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO clients (id, organization_id, name, created_at, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', 'Injecté SQL', now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe('Absence de contexte tenant', () => {
  it('une requête sans contexte ne renvoie aucune donnée métier', async () => {
    const rows = await appPrisma.client.findMany();
    expect(rows).toHaveLength(0);
  });

  it('une écriture sans contexte est refusée par la RLS', async () => {
    await expect(
      appPrisma.client.create({ data: { organizationId: f.orgA, name: 'Sans contexte' } }),
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
    const b = await systemPrisma.client.findUnique({ where: { id: f.clientB } });
    expect(b!.name).toBe('Client B');
  });

  it("la RLS filtre un DELETE brut sans clause de tenant", async () => {
    await withTenant(ctxA(), (db) => db.$executeRawUnsafe('DELETE FROM clients'));
    expect(await systemPrisma.client.count()).toBe(1);
  });
});

describe("Autorisation de l'organisation demandée", () => {
  it('un organizationId fabriqué par le client est rejeté', async () => {
    await expect(resolveTenantContext(fakeSession(f.userA), f.orgB)).rejects.toBeInstanceOf(
      ForbiddenOrganizationError,
    );
  });

  it("l'organisation dont l'utilisateur est membre est acceptée", async () => {
    const ctx = await resolveTenantContext(fakeSession(f.userA), f.orgA);
    expect(ctx).toEqual({ userId: f.userA, organizationId: f.orgA });
  });

  it('un utilisateur ne voit que ses propres appartenances', async () => {
    expect(await listMemberships(fakeSession(f.userA))).toEqual([f.orgA]);
    expect(await listMemberships(fakeSession(f.userB))).toEqual([f.orgB]);
  });
});

describe("Contexte tenant fabriqué (découverte du Lot 0)", () => {
  it("la RLS refuse un contexte dont l'utilisateur n'est pas membre", async () => {
    // Contexte forgé en code : utilisateur A, organisation B. Il contourne à la
    // fois resolveTenantContext (barrière de type) et l'extension Prisma (qui
    // scope sur l'organisation ANNONCÉE). Seule la policy app_is_member arrête.
    const forged = unsafeTenantContextForTests(f.userA, f.orgB);
    const rows = await withTenant(forged, (db) => db.client.findMany());
    expect(rows).toHaveLength(0);
  });

  it('une écriture sous contexte forgé est refusée par la base', async () => {
    const forged = unsafeTenantContextForTests(f.userA, f.orgB);
    await expect(
      withTenant(forged, (db) => db.client.create({ data: { name: 'Forgé' } as never })),
    ).rejects.toThrow(/row-level security/i);
  });

  it("même en SQL brut, un contexte forgé ne voit rien", async () => {
    const forged = unsafeTenantContextForTests(f.userA, f.orgB);
    const rows = await withTenant(forged, (db) =>
      db.$queryRawUnsafe<Array<{ name: string }>>('SELECT name FROM clients'),
    );
    expect(rows).toHaveLength(0);
  });
});

describe("Limites connues de l'extension Prisma (couvertes par la RLS)", () => {
  it("une relation imbriquée n'est PAS filtrée par l'extension, mais l'est par la RLS", async () => {
    const rows = await withTenant(ctxA(), (db) =>
      db.organization.findMany({ include: { clients: true } }),
    );
    // L'extension n'intercepte pas les includes ; c'est la RLS qui garantit
    // qu'aucun client de B n'apparaît ici.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.clients.map((c) => c.name)).toEqual(['Client A']);
  });

  it("un modèle hors périmètre de l'extension reste protégé par la RLS", async () => {
    const orgs = await withTenant(ctxA(), (db) => db.organization.findMany());
    expect(orgs.map((o) => o.id)).toEqual([f.orgA]);
  });
});

describe('Étanchéité symétrique', () => {
  it("B ne voit pas davantage les données de A", async () => {
    const rows = await withTenant(unsafeTenantContextForTests(f.userB, f.orgB), (db) => db.client.findMany());
    expect(rows.map((r) => r.name)).toEqual(['Client B']);
  });
});
