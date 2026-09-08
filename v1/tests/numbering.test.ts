import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { withTenant } from '@/lib/db/withTenant';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import { allocateSequence, formatDocumentNumber } from '@/lib/numbering/allocate';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * Numérotation transactionnelle — mécanisme validé au Lot 0
 * (docs/v1/lot-0-validation.md §6), reporté ici sur le vrai modèle
 * `document_counters`. Ce test de concurrence est BLOQUANT en CI
 * (docs/v1/lot-3-devis.md §Numérotation).
 */

let f: Fixture;

beforeAll(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('formatDocumentNumber — formatage séparé de la valeur métier', () => {
  it('produit le format attendu', () => {
    expect(formatDocumentNumber({ year: 2026, sequence: 1 }, { prefix: 'DEV', includeYear: true, padding: 6 })).toBe(
      'DEV-2026-000001',
    );
  });

  it('accepte un padding différent, sans changer le format par défaut ailleurs', () => {
    expect(formatDocumentNumber({ year: 2026, sequence: 42 }, { prefix: 'DEV', includeYear: true, padding: 3 })).toBe(
      'DEV-2026-042',
    );
  });
});

describe('allocateSequence — séquentiel', () => {
  it('incrémente à chaque appel, dans la même organisation', async () => {
    const ctx = unsafeTenantContextForTests(f.userA, f.orgA);
    const a = await withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year: 2030 }));
    const b = await withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year: 2030 }));
    expect(b).toBe(a + 1);
  });

  it('démarre une séquence indépendante par année', async () => {
    const ctx = unsafeTenantContextForTests(f.userA, f.orgA);
    const seq2031 = await withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year: 2031 }));
    expect(seq2031).toBe(1);
  });

  it('démarre une séquence indépendante par type de document', async () => {
    const ctx = unsafeTenantContextForTests(f.userA, f.orgA);
    const seqInvoice = await withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: 2032 }));
    expect(seqInvoice).toBe(1);
  });

  it('démarre une séquence indépendante par organisation (isolation)', async () => {
    const ctxA = unsafeTenantContextForTests(f.userA, f.orgA);
    const ctxB = unsafeTenantContextForTests(f.userB, f.orgB);
    await withTenant(ctxA, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year: 2033 }));
    const seqB = await withTenant(ctxB, (db) => allocateSequence(db, { organizationId: f.orgB, docType: 'quote', year: 2033 }));
    expect(seqB).toBe(1); // B n'est pas affecté par les allocations de A
  });

  it("refuse l'allocation pour une organisation qui n'est pas celle du contexte", async () => {
    const ctxA = unsafeTenantContextForTests(f.userA, f.orgA);
    await expect(
      withTenant(ctxA, (db) => allocateSequence(db, { organizationId: f.orgB, docType: 'quote', year: 2034 })),
    ).rejects.toThrow();
  });
});

describe('Concurrence — émissions simultanées', () => {
  it('50 allocations concurrentes produisent 50 valeurs strictement uniques et consécutives', async () => {
    const ctx = unsafeTenantContextForTests(f.userA, f.orgA);
    const year = 2040;
    const N = 50;

    const results = await Promise.all(
      Array.from({ length: N }, () =>
        withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year })),
      ),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(N); // aucune collision
    const sorted = [...results].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: N }, (_, i) => i + 1)); // séquence sans trou, 1..50

    const counter = await systemDb.documentCounter.findUniqueOrThrow({
      where: { organizationId_docType_year: { organizationId: f.orgA, docType: 'quote', year } },
    });
    expect(counter.lastValue).toBe(N);
  });

  it('la concurrence sur A ne fuit jamais vers le compteur de B', async () => {
    const ctxA = unsafeTenantContextForTests(f.userA, f.orgA);
    const ctxB = unsafeTenantContextForTests(f.userB, f.orgB);
    const year = 2041;

    await Promise.all([
      ...Array.from({ length: 10 }, () => withTenant(ctxA, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year }))),
      ...Array.from({ length: 10 }, () => withTenant(ctxB, (db) => allocateSequence(db, { organizationId: f.orgB, docType: 'quote', year }))),
    ]);

    const counterA = await systemDb.documentCounter.findUniqueOrThrow({
      where: { organizationId_docType_year: { organizationId: f.orgA, docType: 'quote', year } },
    });
    const counterB = await systemDb.documentCounter.findUniqueOrThrow({
      where: { organizationId_docType_year: { organizationId: f.orgB, docType: 'quote', year } },
    });
    expect(counterA.lastValue).toBe(10);
    expect(counterB.lastValue).toBe(10);
  });
});

describe('Rollback — une transaction qui échoue ne consomme pas de numéro pour de bon', () => {
  it("un rollback après allocation laisse le compteur inchangé, la prochaine allocation réutilise la valeur", async () => {
    const ctx = unsafeTenantContextForTests(f.userA, f.orgA);
    const year = 2042;

    await expect(
      withTenant(ctx, async (db) => {
        await allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year });
        throw new Error('échec volontaire après allocation, pour vérifier le rollback');
      }),
    ).rejects.toThrow('échec volontaire');

    // Le rollback a annulé l'incrément : la prochaine allocation redémarre à 1.
    const next = await withTenant(ctx, (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year }));
    expect(next).toBe(1);
  });
});
