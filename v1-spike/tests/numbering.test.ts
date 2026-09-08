import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { appPrisma, systemPrisma } from '../src/db/client.js';
import { withTenant } from '../src/db/withTenant.js';
import { allocateSequence, formatDocumentNumber } from '../src/numbering/allocate.js';
import { unsafeTenantContextForTests } from '../src/tenant/context.js';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers.js';

/**
 * SPIKE B — Numérotation concurrente.
 * Destiné à devenir un test BLOQUANT de la CI V1.
 */

let f: Fixture;
const YEAR = 2026;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);
const ctxB = () => unsafeTenantContextForTests(f.userB, f.orgB);

beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appPrisma.$disconnect(); await systemPrisma.$disconnect(); });

const counterValue = async (organizationId: string, docType = 'invoice', year = YEAR) =>
  (await systemPrisma.documentCounter.findUnique({
    where: { organizationId_docType_year: { organizationId, docType, year } },
  }))?.lastValue ?? null;

describe('Allocation séquentielle', () => {
  it('démarre à 1 et progresse de 1 en 1', async () => {
    const seqs: number[] = [];
    for (let i = 0; i < 5; i++) {
      seqs.push(await withTenant(ctxA(), (db) =>
        allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: YEAR }),
      ));
    }
    expect(seqs).toEqual([1, 2, 3, 4, 5]);
    expect(await counterValue(f.orgA)).toBe(5);
  });

  it('sépare les compteurs par organisation, par type et par exercice', async () => {
    await withTenant(ctxA(), (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: 2026 }));
    await withTenant(ctxA(), (db) => allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: 2026 }));

    const otherType = await withTenant(ctxA(), (db) =>
      allocateSequence(db, { organizationId: f.orgA, docType: 'quote', year: 2026 }));
    const otherYear = await withTenant(ctxA(), (db) =>
      allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: 2027 }));
    const otherOrg = await withTenant(ctxB(), (db) =>
      allocateSequence(db, { organizationId: f.orgB, docType: 'invoice', year: 2026 }));

    expect([otherType, otherYear, otherOrg]).toEqual([1, 1, 1]);
    expect(await counterValue(f.orgA)).toBe(2);
  });

  it('refuse une allocation visant une organisation étrangère au contexte', async () => {
    // La RLS bloque : le WITH CHECK de document_counters exige l'organisation courante.
    await expect(
      withTenant(ctxA(), (db) => allocateSequence(db, { organizationId: f.orgB, docType: 'invoice', year: YEAR })),
    ).rejects.toThrow();
    expect(await counterValue(f.orgB)).toBeNull();
  });
});

describe('Concurrence', () => {
  it('50 émissions simultanées produisent 50 numéros distincts, sans trou', async () => {
    const CONCURRENT = 50;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        withTenant(ctxA(), (db) =>
          allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: YEAR }),
        ),
      ),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(CONCURRENT);                                   // aucun doublon
    expect([...unique].sort((a, b) => a - b)).toEqual(
      Array.from({ length: CONCURRENT }, (_, i) => i + 1),                  // 1..50, aucun trou
    );
    expect(await counterValue(f.orgA)).toBe(CONCURRENT);                    // compteur final exact
  });

  it("l'insertion concurrente de documents ne produit aucun numéro dupliqué", async () => {
    const CONCURRENT = 30;
    await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        withTenant(ctxA(), async (db) => {
          const sequence = await allocateSequence(db, {
            organizationId: f.orgA, docType: 'invoice', year: YEAR,
          });
          const number = formatDocumentNumber(
            { year: YEAR, sequence },
            { prefix: 'FAC', includeYear: true },
          );
          // La contrainte UNIQUE (organization_id, number) est le dernier filet :
          // si l'allocation était défaillante, cette insertion échouerait.
          await db.issuedDocument.create({
            data: {
              clientId: f.clientA, docType: 'invoice', year: YEAR, sequence, number,
              clientSnapshot: { name: 'Client A' }, sellerSnapshot: { legalName: 'A SARL' },
              totalHtCents: 10_000, totalVatCents: 2_000, totalTtcCents: 12_000,
            } as never,
          });
        }),
      ),
    );

    const docs = await systemPrisma.issuedDocument.findMany({ where: { organizationId: f.orgA } });
    expect(docs).toHaveLength(CONCURRENT);
    expect(new Set(docs.map((d) => d.number)).size).toBe(CONCURRENT);
  });

  it("l'approche naïve MAX+1 — celle de la V0 — produit bien des collisions", async () => {
    // Démonstration de ce que l'architecture interdit. Le délai entre lecture et
    // écriture rend la course déterministe ; en production elle est simplement
    // moins probable, pas moins réelle.
    const naive = (delayMs: number) =>
      withTenant(ctxA(), async (db) => {
        const rows = await db.$queryRawUnsafe<Array<{ max: number | null }>>(
          'SELECT MAX(sequence) AS max FROM issued_documents',
        );
        const next = (rows[0]?.max ?? 0) + 1;
        await new Promise((r) => setTimeout(r, delayMs));
        return next;
      });

    const [a, b] = await Promise.all([naive(60), naive(60)]);
    expect(a).toBe(b); // ← deux documents obtiendraient le MÊME numéro
  });
});

describe('Rollback', () => {
  it("un échec d'émission ne consomme pas de numéro : aucun trou dans la séquence", async () => {
    const first = await withTenant(ctxA(), (db) =>
      allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: YEAR }));
    expect(first).toBe(1);

    // Transaction qui alloue puis échoue volontairement.
    await expect(
      withTenant(ctxA(), async (db) => {
        const seq = await allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: YEAR });
        expect(seq).toBe(2);
        throw new Error('échec volontaire après allocation');
      }),
    ).rejects.toThrow('échec volontaire');

    // Le compteur est revenu en arrière avec la transaction.
    expect(await counterValue(f.orgA)).toBe(1);

    // Le numéro 2 est réattribué : la séquence reste continue.
    const next = await withTenant(ctxA(), (db) =>
      allocateSequence(db, { organizationId: f.orgA, docType: 'invoice', year: YEAR }));
    expect(next).toBe(2);
    expect(await counterValue(f.orgA)).toBe(2);
  });
});

describe('Format', () => {
  it('sépare la valeur métier de sa représentation', () => {
    expect(formatDocumentNumber({ year: 2026, sequence: 1 }, { prefix: 'FAC', includeYear: true }))
      .toBe('FAC-2026-000001');
    expect(formatDocumentNumber({ year: 2026, sequence: 42 }, { prefix: 'DEV', includeYear: false }))
      .toBe('DEV-000042');
    expect(formatDocumentNumber({ year: 2026, sequence: 7 }, { prefix: 'FAC', includeYear: true, padding: 4 }))
      .toBe('FAC-2026-0007');
  });
});
