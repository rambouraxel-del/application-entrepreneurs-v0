import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { withTenant } from '@/lib/db/withTenant';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as quotes from '@/modules/quotes/service';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * Quote — le premier workflow financier réel (docs/v1/lot-3-devis.md).
 * Couvre CRUD, isolation croisée A/B, client cross-tenant bloqué,
 * immutabilité après émission et transaction d'émission (numéro, snapshots).
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);
const ctxB = () => unsafeTenantContextForTests(f.userB, f.orgB);

const line = (overrides: Partial<Record<string, string>> = {}) => ({
  description: 'Prestation',
  quantity: '1',
  unitPrice: '100',
  vatRateBp: '2000',
  ...overrides,
});

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('Création / lecture', () => {
  it('crée un devis brouillon pour un client de son organisation', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    expect(quote.organizationId).toBe(f.orgA);
    expect(quote.status).toBe('draft');
    expect(quote.number).toBeNull();
    expect(quote.totalTtcCents).toBe(0);
  });

  it("refuse un devis pour un client d'une autre organisation, même en connaissant son UUID", async () => {
    await expect(quotes.createQuote(ctxA(), { clientId: f.clientB })).rejects.toThrow();
    const count = await systemDb.quote.count({ where: { organizationId: f.orgA } });
    expect(count).toBe(0);
  });

  it('refuse un client inexistant', async () => {
    await expect(quotes.createQuote(ctxA(), { clientId: '00000000-0000-0000-0000-000000000000' })).rejects.toThrow();
  });
});

describe('Lignes', () => {
  it('ajoute une ligne et recalcule les totaux du devis', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    const totals = await quotes.addLine(ctxA(), quote.id, line({ quantity: '2', unitPrice: '50', vatRateBp: '2000' }));
    expect(totals.totalHtCents).toBe(10000); // 2 × 50,00 €
    expect(totals.totalVatCents).toBe(2000);
    expect(totals.totalTtcCents).toBe(12000);
  });

  it('plusieurs lignes à taux différents -> ventilation TVA correcte', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line({ unitPrice: '100', vatRateBp: '2000' }));
    const totals = await quotes.addLine(ctxA(), quote.id, line({ unitPrice: '100', vatRateBp: '550' }));
    expect(totals.vatBreakdown).toHaveLength(2);
    expect(totals.totalHtCents).toBe(20000);
  });

  it('modifie une ligne existante', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    const [l] = await withTenant(ctxA(), (db) => db.quoteLine.findMany({ where: { quoteId: quote.id } }));
    const totals = await quotes.updateLine(ctxA(), quote.id, l!.id, line({ unitPrice: '200' }));
    expect(totals.totalHtCents).toBe(20000);
  });

  it('supprime une ligne et recalcule', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    const [l] = await withTenant(ctxA(), (db) => db.quoteLine.findMany({ where: { quoteId: quote.id } }));
    const totals = await quotes.removeLine(ctxA(), quote.id, l!.id);
    expect(totals.totalHtCents).toBe(0);
  });

  it('rejette une description vide', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.addLine(ctxA(), quote.id, line({ description: '  ' }))).rejects.toThrow();
  });

  it('rejette une quantité invalide ou négative', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.addLine(ctxA(), quote.id, line({ quantity: '-1' }))).rejects.toThrow();
    await expect(quotes.addLine(ctxA(), quote.id, line({ quantity: 'abc' }))).rejects.toThrow();
  });

  it('rejette un taux de TVA hors liste', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.addLine(ctxA(), quote.id, line({ vatRateBp: '1234' }))).rejects.toThrow();
  });

  it('rejette une remise hors bornes', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.addLine(ctxA(), quote.id, line({ discountPercent: '150' }))).rejects.toThrow();
  });
});

describe('Émission — transaction', () => {
  it('émet un devis avec au moins une ligne : numéro alloué, snapshots figés, statut sent', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line({ quantity: '1', unitPrice: '1000', vatRateBp: '2000' }));

    const emitted = await quotes.emitQuote(ctxA(), quote.id);
    expect(emitted.status).toBe('sent');
    expect(emitted.issuedAt).not.toBeNull();
    expect(emitted.number).toMatch(/^DEV-\d{4}-\d{6}$/);
    expect(emitted.clientSnapshot).not.toBeNull();
    expect(emitted.organizationSnapshot).not.toBeNull();
    expect(emitted.totalTtcCents).toBe(120000);
  });

  it('refuse d’émettre un devis sans ligne', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.emitQuote(ctxA(), quote.id)).rejects.toThrow();
  });

  it('refuse de ré-émettre un devis déjà émis', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    await expect(quotes.emitQuote(ctxA(), quote.id)).rejects.toThrow();
  });

  it('numéros séquentiels sans trou pour deux émissions successives', async () => {
    const q1 = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), q1.id, line());
    const e1 = await quotes.emitQuote(ctxA(), q1.id);

    const q2 = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), q2.id, line());
    const e2 = await quotes.emitQuote(ctxA(), q2.id);

    const n1 = Number(e1.number!.split('-').at(-1));
    const n2 = Number(e2.number!.split('-').at(-1));
    expect(n2).toBe(n1 + 1);
  });
});

describe('Immutabilité — le point critique du Lot 3', () => {
  it('modifier la fiche Client APRÈS émission ne change pas le snapshot du devis', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    const emitted = await quotes.emitQuote(ctxA(), quote.id);
    const snapshotBefore = emitted.clientSnapshot;

    await withTenant(ctxA(), (db) => db.client.update({ where: { id: f.clientA }, data: { name: 'Nom changé après émission' } }));

    const reloaded = await quotes.getQuote(ctxA(), quote.id);
    expect(reloaded!.clientSnapshot).toEqual(snapshotBefore);
    expect((reloaded!.clientSnapshot as { name: string }).name).not.toBe('Nom changé après émission');
  });

  it('toute mutation directe (hors statut/PDF) sur un devis émis est refusée par la base', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);

    await expect(
      withTenant(ctxA(), (db) => db.quote.update({ where: { id: quote.id }, data: { notes: 'hack' } })),
    ).rejects.toThrow();
  });

  it('impossible d’ajouter, modifier ou supprimer une ligne après émission', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);

    await expect(quotes.addLine(ctxA(), quote.id, line())).rejects.toThrow();
    const [l] = await withTenant(ctxA(), (db) => db.quoteLine.findMany({ where: { quoteId: quote.id } }));
    await expect(quotes.updateLine(ctxA(), quote.id, l!.id, line())).rejects.toThrow();
    await expect(quotes.removeLine(ctxA(), quote.id, l!.id)).rejects.toThrow();
  });

  it('impossible de supprimer un devis émis (seul un brouillon le permet)', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    await expect(quotes.deleteDraftQuote(ctxA(), quote.id)).rejects.toThrow();
  });

  it('un devis émis existe toujours en base après tentative de mutation refusée (pas de demi-état)', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    const emitted = await quotes.emitQuote(ctxA(), quote.id);
    await expect(
      withTenant(ctxA(), (db) => db.quote.update({ where: { id: quote.id }, data: { notes: 'hack' } })),
    ).rejects.toThrow();
    const after = await systemDb.quote.findUniqueOrThrow({ where: { id: quote.id } });
    expect(after.number).toBe(emitted.number);
    expect(after.totalTtcCents).toBe(emitted.totalTtcCents);
  });
});

describe('Statuts — machine d’état', () => {
  it('sent -> accepted', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    const accepted = await quotes.acceptQuote(ctxA(), quote.id);
    expect(accepted.status).toBe('accepted');
  });

  it('sent -> rejected', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    const rejected = await quotes.rejectQuote(ctxA(), quote.id);
    expect(rejected.status).toBe('rejected');
  });

  it('sent -> expired', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    const expired = await quotes.expireQuote(ctxA(), quote.id);
    expect(expired.status).toBe('expired');
  });

  it('refuse accepted/rejected/expired sur un brouillon (pas encore envoyé)', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(quotes.acceptQuote(ctxA(), quote.id)).rejects.toThrow();
  });

  it('refuse une double transition (accepted -> rejected)', async () => {
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line());
    await quotes.emitQuote(ctxA(), quote.id);
    await quotes.acceptQuote(ctxA(), quote.id);
    await expect(quotes.rejectQuote(ctxA(), quote.id)).rejects.toThrow();
  });
});

describe('Isolation multi-tenant', () => {
  it('A ne voit pas les devis de B', async () => {
    await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.createQuote(ctxB(), { clientId: f.clientB });
    const listA = await quotes.listQuotes(ctxA());
    expect(listA).toHaveLength(1);
  });

  it('A ne peut pas lire le devis de B par son identifiant', async () => {
    const quoteB = await quotes.createQuote(ctxB(), { clientId: f.clientB });
    const read = await quotes.getQuote(ctxA(), quoteB.id);
    expect(read).toBeNull();
  });

  it('A ne peut pas modifier le brouillon de B', async () => {
    const quoteB = await quotes.createQuote(ctxB(), { clientId: f.clientB });
    await expect(quotes.updateQuoteMeta(ctxA(), quoteB.id, { clientId: f.clientA })).rejects.toThrow();
  });

  it('A ne peut pas ajouter de ligne au devis de B', async () => {
    const quoteB = await quotes.createQuote(ctxB(), { clientId: f.clientB });
    await expect(quotes.addLine(ctxA(), quoteB.id, line())).rejects.toThrow();
    const lines = await systemDb.quoteLine.count({ where: { quoteId: quoteB.id } });
    expect(lines).toBe(0);
  });

  it("la RLS refuse une insertion brute de devis visant l'organisation de B", async () => {
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO quotes (id, organization_id, client_id, status, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', '${f.clientB}', 'draft', now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("la RLS refuse une insertion brute de ligne visant l'organisation de B", async () => {
    const quoteB = await systemDb.quote.create({ data: { organizationId: f.orgB, clientId: f.clientB } });
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO quote_lines (id, organization_id, quote_id, position, description, quantity_milli, unit_price_cents, vat_rate_bp, gross_ht_cents, discount_cents, net_ht_cents, vat_cents, total_ttc_cents, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', '${quoteB.id}', 1, 'x', 1000, 100, 2000, 100, 0, 100, 20, 120, now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
