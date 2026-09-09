import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as quotes from '@/modules/quotes/service';
import * as invoices from '@/modules/invoices/service';
import * as payments from '@/modules/payments/service';
import { resetDatabase, seedTwoOrganizations, makeInvoicingReady, type Fixture } from './helpers';

/**
 * Payment (Lot 4 §25-34) : enregistrement, paiement partiel, restant dû,
 * refus de surpaiement, concurrence, idempotence, annulation traçable,
 * isolation multi-tenant.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);
const ctxB = () => unsafeTenantContextForTests(f.userB, f.orgB);

const line = { description: 'Prestation', quantity: '1', unitPrice: '1000', vatRateBp: '2000' }; // 1000€ HT -> 1200€ TTC

async function emittedInvoice(ctx: ReturnType<typeof unsafeTenantContextForTests>, orgId: string, clientId: string) {
  await makeInvoicingReady(orgId, clientId);
  const quote = await quotes.createQuote(ctx, { clientId });
  await quotes.addLine(ctx, quote.id, line);
  await quotes.emitQuote(ctx, quote.id);
  const accepted = await quotes.acceptQuote(ctx, quote.id);
  const draft = await invoices.transformQuoteToInvoice(ctx, accepted.id);
  return invoices.emitInvoice(ctx, draft!.id); // total = 120 000 cents (1200,00 €)
}

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('Enregistrement / paiement partiel', () => {
  it('enregistre un paiement partiel', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const payment = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-15', method: 'bank_transfer' });
    expect(payment.amountCents).toBe(50_000);
  });

  it('plusieurs paiements partiels s’accumulent jusqu’au total', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await payments.recordPayment(ctxA(), invoice.id, { amount: '700', paidAt: '2026-01-10', method: 'bank_transfer' });
    await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-20', method: 'card' });
    const list = await payments.listPayments(ctxA(), invoice.id);
    const total = list.reduce((s, p) => s + p.amountCents, 0);
    expect(total).toBe(120_000);
  });

  it('refuse un paiement sur une facture brouillon', async () => {
    await makeInvoicingReady(f.orgA, f.clientA);
    const quote = await quotes.createQuote(ctxA(), { clientId: f.clientA });
    await quotes.addLine(ctxA(), quote.id, line);
    await quotes.emitQuote(ctxA(), quote.id);
    const accepted = await quotes.acceptQuote(ctxA(), quote.id);
    const draft = await invoices.transformQuoteToInvoice(ctxA(), accepted.id);
    await expect(payments.recordPayment(ctxA(), draft!.id, { amount: '100', paidAt: '2026-01-01' })).rejects.toThrow();
  });

  it('rejette un montant invalide ou une date invalide', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await expect(payments.recordPayment(ctxA(), invoice.id, { amount: 'abc', paidAt: '2026-01-01' })).rejects.toThrow();
    await expect(payments.recordPayment(ctxA(), invoice.id, { amount: '100', paidAt: 'pas-une-date' })).rejects.toThrow();
    await expect(payments.recordPayment(ctxA(), invoice.id, { amount: '-100', paidAt: '2026-01-01' })).rejects.toThrow();
  });
});

describe('Surpaiement — refusé par défaut', () => {
  it('refuse un paiement qui dépasserait le restant dû', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await expect(payments.recordPayment(ctxA(), invoice.id, { amount: '2000', paidAt: '2026-01-01' })).rejects.toThrow();
  });

  it('refuse un paiement supplémentaire une fois la facture intégralement payée', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await payments.recordPayment(ctxA(), invoice.id, { amount: '1200', paidAt: '2026-01-01' });
    await expect(payments.recordPayment(ctxA(), invoice.id, { amount: '1', paidAt: '2026-01-02' })).rejects.toThrow();
  });

  it('accepte un paiement qui solde exactement le restant dû', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await payments.recordPayment(ctxA(), invoice.id, { amount: '1200', paidAt: '2026-01-01' });
    const list = await payments.listPayments(ctxA(), invoice.id);
    expect(list.reduce((s, p) => s + p.amountCents, 0)).toBe(120_000);
  });
});

describe('Concurrence — le point critique du Lot 4', () => {
  it('deux paiements simultanés de 80 € sur un restant de 100 € : un seul doit passer, jamais 160 €', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA); // restant 1200 €
    await payments.recordPayment(ctxA(), invoice.id, { amount: '1100', paidAt: '2026-01-01' }); // restant 100 €

    const results = await Promise.allSettled([
      payments.recordPayment(ctxA(), invoice.id, { amount: '80', paidAt: '2026-01-02' }),
      payments.recordPayment(ctxA(), invoice.id, { amount: '80', paidAt: '2026-01-02' }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(1); // un seul des deux passe (80€ sur 100€ restant, le second dépasserait)

    const list = await payments.listPayments(ctxA(), invoice.id);
    const total = list.filter((p) => !p.cancelledAt).reduce((s, p) => s + p.amountCents, 0);
    expect(total).toBeLessThanOrEqual(120_000); // jamais de dépassement, quel que soit l'ordre réel d'exécution
  });

  it('50 tentatives de paiement concurrentes sur une facture de 1200 € (payables : 12 × 100 €) : exactement 12 réussissent', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const attempts = Array.from({ length: 50 }, (_, i) =>
      payments.recordPayment(ctxA(), invoice.id, { amount: '100', paidAt: '2026-01-01', reference: `p${i}` }),
    );
    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(12);

    const list = await payments.listPayments(ctxA(), invoice.id);
    const total = list.filter((p) => !p.cancelledAt).reduce((s, p) => s + p.amountCents, 0);
    expect(total).toBe(120_000); // jamais dépassé, jamais perdu
  }, 30_000);
});

describe('Idempotence — anti double-clic (§32)', () => {
  it('la même idempotencyKey soumise deux fois ne crée qu’un seul paiement', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const key = 'double-click-key-1';
    const p1 = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: key });
    const p2 = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: key });
    expect(p2.id).toBe(p1.id);
    const list = await payments.listPayments(ctxA(), invoice.id);
    expect(list).toHaveLength(1);
  });

  it('deux soumissions concurrentes avec la même clé ne créent qu’un seul paiement', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const key = 'double-click-concurrent';
    const [p1, p2] = await Promise.all([
      payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: key }),
      payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: key }),
    ]);
    expect(p1.id).toBe(p2.id);
    const list = await payments.listPayments(ctxA(), invoice.id);
    expect(list).toHaveLength(1);
  });

  it('des clés différentes créent bien deux paiements distincts', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: 'key-a' });
    await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01', idempotencyKey: 'key-b' });
    const list = await payments.listPayments(ctxA(), invoice.id);
    expect(list).toHaveLength(2);
  });
});

describe('Annulation — traçable, jamais un hard-delete', () => {
  it('un paiement annulé reste en base mais sort du calcul du restant dû', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const payment = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01' });
    const cancelled = await payments.cancelPayment(ctxA(), payment.id, { reason: 'Erreur de saisie' });
    expect(cancelled.cancelledAt).not.toBeNull();

    const stillThere = await systemDb.payment.findUnique({ where: { id: payment.id } });
    expect(stillThere).not.toBeNull(); // jamais supprimé

    // Le restant redevient disponible : un nouveau paiement du même montant doit passer.
    await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-02' });
  });

  it('refuse d’annuler un paiement déjà annulé', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const payment = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01' });
    await payments.cancelPayment(ctxA(), payment.id, { reason: 'Erreur' });
    await expect(payments.cancelPayment(ctxA(), payment.id, { reason: 'Encore' })).rejects.toThrow();
  });

  it('la base refuse une suppression directe de paiement, même annulé', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const payment = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01' });
    await expect(systemDb.payment.delete({ where: { id: payment.id } })).rejects.toThrow();
  });

  it('la base refuse une modification directe du montant d’un paiement', async () => {
    const invoice = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const payment = await payments.recordPayment(ctxA(), invoice.id, { amount: '500', paidAt: '2026-01-01' });
    await expect(systemDb.payment.update({ where: { id: payment.id }, data: { amountCents: 999 } })).rejects.toThrow();
  });
});

describe('Multi-tenancy', () => {
  it('A crée un paiement sur sa facture -> OK ; sur la facture de B -> refus', async () => {
    const invoiceA = await emittedInvoice(ctxA(), f.orgA, f.clientA);
    const invoiceB = await emittedInvoice(ctxB(), f.orgB, f.clientB);

    await payments.recordPayment(ctxA(), invoiceA.id, { amount: '100', paidAt: '2026-01-01' });
    await expect(payments.recordPayment(ctxA(), invoiceB.id, { amount: '100', paidAt: '2026-01-01' })).rejects.toThrow();
  });

  it('A ne lit pas les paiements de B', async () => {
    const invoiceB = await emittedInvoice(ctxB(), f.orgB, f.clientB);
    await payments.recordPayment(ctxB(), invoiceB.id, { amount: '100', paidAt: '2026-01-01' });
    const listFromA = await payments.listPayments(ctxA(), invoiceB.id);
    expect(listFromA).toHaveLength(0); // RLS filtre : aucune ligne visible
  });

  it('A ne peut pas annuler un paiement de B', async () => {
    const invoiceB = await emittedInvoice(ctxB(), f.orgB, f.clientB);
    const paymentB = await payments.recordPayment(ctxB(), invoiceB.id, { amount: '100', paidAt: '2026-01-01' });
    await expect(payments.cancelPayment(ctxA(), paymentB.id, { reason: 'x' })).rejects.toThrow();
  });

  it("la RLS refuse une insertion brute de paiement visant l'organisation de B", async () => {
    const invoiceB = await emittedInvoice(ctxB(), f.orgB, f.clientB);
    await expect(
      appDb.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '${f.userA}', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', '${f.orgA}', true)`);
        await tx.$executeRawUnsafe(
          `INSERT INTO payments (id, organization_id, invoice_id, amount_cents, paid_at, method, created_at)
           VALUES (gen_random_uuid(), '${f.orgB}', '${invoiceB.id}', 100, now(), 'bank_transfer', now())`,
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });
});
