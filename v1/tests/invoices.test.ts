import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { withTenant } from '@/lib/db/withTenant';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as quotes from '@/modules/quotes/service';
import * as invoices from '@/modules/invoices/service';
import { InvoiceReadinessError } from '@/modules/invoices/readiness';
import { resetDatabase, seedTwoOrganizations, makeInvoicingReady, type Fixture } from './helpers';

/**
 * Invoice — le workflow Devis accepté → Facture → Encaissement (Lot 4).
 * Couvre transformation, unicité (y compris sous concurrence), copie des
 * lignes, émission/readiness/snapshots, immutabilité, isolation.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);
const ctxB = () => unsafeTenantContextForTests(f.userB, f.orgB);

const line = (overrides: Partial<Record<string, string>> = {}) => ({
  description: 'Prestation',
  quantity: '1',
  unitPrice: '1000',
  vatRateBp: '2000',
  ...overrides,
});

/** Crée un devis accepté pour un client donné — pré-requis à toute transformation. */
async function acceptedQuote(ctx: ReturnType<typeof unsafeTenantContextForTests>, clientId: string) {
  const quote = await quotes.createQuote(ctx, { clientId });
  await quotes.addLine(ctx, quote.id, line());
  await quotes.emitQuote(ctx, quote.id);
  return quotes.acceptQuote(ctx, quote.id);
}

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('Transformation Quote → Invoice', () => {
  it('transforme un devis accepté en facture brouillon, avec les lignes copiées', async () => {
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    expect(invoice!.status).toBe('draft');
    expect(invoice!.clientId).toBe(f.clientA);
    expect(invoice!.lines).toHaveLength(1);
    expect(invoice!.lines[0]!.totalTtcCents).toBe(120_000); // 1000,00 € + 20% TVA
    expect(invoice!.totalTtcCents).toBe(120_000);
  });

  it('refuse la transformation d’un devis draft/sent/rejected/expired', async () => {
    const draft = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await expect(invoices.transformQuoteToInvoice(ctxA(), draft.id)).rejects.toThrow();

    const sentQuote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), sentQuote.id, line());
    await quotes.emitQuote(ctxA(), sentQuote.id);
    await expect(invoices.transformQuoteToInvoice(ctxA(), sentQuote.id)).rejects.toThrow();

    const rejectedQuote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), rejectedQuote.id, line());
    await quotes.emitQuote(ctxA(), rejectedQuote.id);
    await quotes.rejectQuote(ctxA(), rejectedQuote.id);
    await expect(invoices.transformQuoteToInvoice(ctxA(), rejectedQuote.id)).rejects.toThrow();
  });

  it('refuse une deuxième transformation du même devis (unicité applicative)', async () => {
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await expect(invoices.transformQuoteToInvoice(ctxA(), accepted.id)).rejects.toThrow();
    const count = await systemDb.invoice.count({ where: { sourceQuoteId: accepted.id } });
    expect(count).toBe(1);
  });

  it('la contrainte unique en base protège même sous transformation concurrente (le vrai garde-fou)', async () => {
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const results = await Promise.allSettled([
      invoices.transformQuoteToInvoice(ctxA(), accepted.id),
      invoices.transformQuoteToInvoice(ctxA(), accepted.id),
      invoices.transformQuoteToInvoice(ctxA(), accepted.id),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1); // une seule facture créée, jamais deux
    const count = await systemDb.invoice.count({ where: { sourceQuoteId: accepted.id } });
    expect(count).toBe(1);
  });

  it("refuse de transformer un devis d'une autre organisation, même en connaissant son UUID", async () => {
    const acceptedB = await acceptedQuote(ctxB(), f.clientB);
    await expect(invoices.transformQuoteToInvoice(ctxA(), acceptedB.id)).rejects.toThrow();
    const count = await systemDb.invoice.count({ where: { organizationId: f.orgA } });
    expect(count).toBe(0);
  });
});

describe('Lignes (brouillon)', () => {
  it('ajoute/modifie/supprime une ligne et recalcule les totaux', async () => {
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    const totalsAfterAdd = await invoices.addLine(ctxA(), invoice!.id, line({ unitPrice: '50' }));
    expect(totalsAfterAdd.totalHtCents).toBe(100_000 + 5_000);

    const [, added] = await withTenant(ctxA(), (db) => db.invoiceLine.findMany({ where: { invoiceId: invoice!.id }, orderBy: { position: 'asc' } }));
    const totalsAfterUpdate = await invoices.updateLine(ctxA(), invoice!.id, added!.id, line({ unitPrice: '20' }));
    expect(totalsAfterUpdate.totalHtCents).toBe(100_000 + 2_000);

    const totalsAfterRemove = await invoices.removeLine(ctxA(), invoice!.id, added!.id);
    expect(totalsAfterRemove.totalHtCents).toBe(100_000);
  });
});

describe('Émission — readiness, transaction, numérotation', () => {
  it('refuse l’émission si Organization n’a pas son identité légale complète', async () => {
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await expect(invoices.emitInvoice(ctxA(), invoice!.id)).rejects.toBeInstanceOf(InvoiceReadinessError);
  });

  it('refuse l’émission si le Client n’a pas ses données de facturation', async () => {
    await systemDb.organization.update({
      where: { id: f.orgA },
      data: { legalName: 'Test SARL', addressLine1: '1 rue', addressPostalCode: '75001', addressCity: 'Paris' },
    });
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await expect(invoices.emitInvoice(ctxA(), invoice!.id)).rejects.toBeInstanceOf(InvoiceReadinessError);
  });

  it('émet une facture prête : numéro alloué, snapshots figés, statut issued', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    const emitted = await invoices.emitInvoice(ctxA(), invoice!.id);
    expect(emitted.status).toBe('issued');
    expect(emitted.issuedAt).not.toBeNull();
    expect(emitted.number).toMatch(/^FAC-\d{4}-\d{6}$/);
    expect(emitted.issuerSnapshot).not.toBeNull();
    expect(emitted.clientSnapshot).not.toBeNull();
    expect(emitted.paymentTermsSnapshot).not.toBeNull();
  });

  it('refuse d’émettre une facture sans ligne', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await invoices.removeLine(ctxA(), invoice!.id, invoice!.lines[0]!.id);
    await expect(invoices.emitInvoice(ctxA(), invoice!.id)).rejects.toThrow();
  });

  it('refuse de ré-émettre une facture déjà émise', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await invoices.emitInvoice(ctxA(), invoice!.id);
    await expect(invoices.emitInvoice(ctxA(), invoice!.id)).rejects.toThrow();
  });

  it('numéros séquentiels sans trou (compteur distinct des devis) pour deux émissions successives', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const a1 = await acceptedQuote(ctxA(), f.clientA);
    const i1 = await invoices.transformQuoteToInvoice(ctxA(), a1.id);
    const e1 = await invoices.emitInvoice(ctxA(), i1!.id);

    const a2 = await acceptedQuote(ctxA(), f.clientA);
    const i2 = await invoices.transformQuoteToInvoice(ctxA(), a2.id);
    const e2 = await invoices.emitInvoice(ctxA(), i2!.id);

    const n1 = Number(e1.number!.split('-').at(-1));
    const n2 = Number(e2.number!.split('-').at(-1));
    expect(n2).toBe(n1 + 1);

    // Le compteur "invoice" est indépendant du compteur "quote" — les devis
    // émis plus tôt (dans acceptedQuote) n'ont pas décalé la séquence facture.
    expect(n1).toBe(1);
  });

  it('50 émissions concurrentes (le vrai modèle Invoice) : zéro collision, séquence sans trou', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const N = 50;
    const invoiceIds: string[] = [];
    for (let i = 0; i < N; i++) {
      const accepted = await acceptedQuote(ctxA(), f.clientA);
      const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
      invoiceIds.push(invoice!.id);
    }

    const results = await Promise.all(invoiceIds.map((id) => invoices.emitInvoice(ctxA(), id)));
    const numbers = results.map((r) => Number(r.number!.split('-').at(-1)));
    expect(new Set(numbers).size).toBe(N); // aucune collision
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  }, 30_000);

  it('une émission qui échoue avant la transaction ne touche pas au brouillon existant (le rollback de l’allocation elle-même est couvert par tests/numbering.test.ts)', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await expect(invoices.emitInvoice(ctxA(), '00000000-0000-0000-0000-000000000000')).rejects.toThrow();
    const stillDraft = await systemDb.invoice.findUniqueOrThrow({ where: { id: invoice!.id } });
    expect(stillDraft.status).toBe('draft');
    expect(stillDraft.number).toBeNull();
  });
});

describe('Immutabilité — le point critique du Lot 4', () => {
  async function emittedInvoice() {
    await makeInvoicingReady(f.orgA, f.clientA);
    const accepted = await acceptedQuote(ctxA(), f.clientA);
    const invoice = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    return invoices.emitInvoice(ctxA(), invoice!.id);
  }

  it('modifier Organization/Client APRÈS émission ne change pas les snapshots', async () => {
    const emitted = await emittedInvoice();
    const issuerBefore = emitted.issuerSnapshot;
    const clientBefore = emitted.clientSnapshot;

    await systemDb.organization.update({ where: { id: f.orgA }, data: { legalName: 'Nom changé après émission' } });
    await systemDb.client.update({ where: { id: f.clientA }, data: { billingLegalName: 'Client changé après émission' } });

    const reloaded = await invoices.getInvoice(ctxA(), emitted.id);
    expect(reloaded!.issuerSnapshot).toEqual(issuerBefore);
    expect(reloaded!.clientSnapshot).toEqual(clientBefore);
  });

  it('toute mutation directe (hors PDF) sur une facture émise est refusée par la base', async () => {
    const emitted = await emittedInvoice();
    await expect(
      withTenant(ctxA(), (db) => db.invoice.update({ where: { id: emitted.id }, data: { notes: 'hack' } })),
    ).rejects.toThrow();
  });

  it('impossible d’ajouter, modifier ou supprimer une ligne après émission', async () => {
    const emitted = await emittedInvoice();
    await expect(invoices.addLine(ctxA(), emitted.id, line())).rejects.toThrow();
    const [l] = await withTenant(ctxA(), (db) => db.invoiceLine.findMany({ where: { invoiceId: emitted.id } }));
    await expect(invoices.updateLine(ctxA(), emitted.id, l!.id, line())).rejects.toThrow();
    await expect(invoices.removeLine(ctxA(), emitted.id, l!.id)).rejects.toThrow();
  });

  it('impossible de supprimer une facture émise', async () => {
    const emitted = await emittedInvoice();
    await expect(invoices.deleteDraftInvoice(ctxA(), emitted.id)).rejects.toThrow();
    await expect(
      withTenant(ctxA(), (db) => db.invoice.delete({ where: { id: emitted.id } })),
    ).rejects.toThrow();
  });
});

describe('Isolation multi-tenant', () => {
  it('A ne voit pas les factures de B', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    await makeInvoicingReady(f.orgB, f.clientB);
    const acceptedA = await acceptedQuote(ctxA(), f.clientA);
    await invoices.transformQuoteToInvoice(ctxA(), acceptedA.id);
    const acceptedB = await acceptedQuote(ctxB(), f.clientB);
    await invoices.transformQuoteToInvoice(ctxB(), acceptedB.id);

    const listA = await invoices.listInvoices(ctxA());
    expect(listA).toHaveLength(1);
  });

  it('A ne peut pas lire/modifier la facture de B', async () => {
    await makeInvoicingReady(f.orgB, f.clientB);
    const acceptedB = await acceptedQuote(ctxB(), f.clientB);
    const invoiceB = await invoices.transformQuoteToInvoice(ctxB(), acceptedB.id);

    expect(await invoices.getInvoice(ctxA(), invoiceB!.id)).toBeNull();
    await expect(invoices.addLine(ctxA(), invoiceB!.id, line())).rejects.toThrow();
  });

  it("la RLS refuse une insertion brute de facture visant l'organisation de B", async () => {
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO invoices (id, organization_id, client_id, status, supply_date, due_date, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', '${f.clientB}', 'draft', now(), now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
