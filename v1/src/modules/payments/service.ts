import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { formatCents } from '@/lib/billing/calc';
import { computePaymentAmounts } from '@/modules/invoices/paymentStatus';
import { paymentInputSchema, cancelPaymentInputSchema } from './validation';
import * as repo from './repository';

/**
 * Service métier Payment (docs/v1/lot-4-factures-paiements.md §10/§25-34).
 * Un paiement est un FAIT TRAÇABLE : jamais mutable en place, jamais
 * supprimé (annulation seulement — voir prisma/rls.sql, trigger
 * `payments_protect_recorded`/`payments_forbid_delete`).
 */

class PaymentError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

/**
 * Enregistrement d'un paiement — transactionnel et sûr sous concurrence
 * (§31) : `SELECT ... FOR UPDATE` sur la facture SÉRIALISE deux
 * enregistrements simultanés sur la même facture (la seconde transaction
 * attend le commit de la première avant de lire le restant dû à jour).
 * Surpaiement refusé par défaut (§30) — pas de gestion d'avoirs au Lot 4.
 * Idempotence (§32) : un `idempotencyKey` déjà vu renvoie le paiement
 * existant plutôt que d'en créer un second (double-clic/retry).
 */
export async function recordPayment(ctx: TenantContext, invoiceId: string, raw: unknown) {
  const input = paymentInputSchema.parse(raw);

  if (input.idempotencyKey) {
    const existing = await withTenant(ctx, (db) => repo.findByIdempotencyKey(db, input.idempotencyKey!));
    if (existing) return existing;
  }

  try {
    return await withTenant(ctx, async (db) => {
      // Verrou transactionnel : toute transaction concurrente tentant de payer
      // la MÊME facture attend ici jusqu'au commit/rollback de celle-ci.
      await repo.lockInvoiceForPayment(db, invoiceId);

      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error('Facture introuvable dans cette organisation.');
      if (invoice.status !== 'issued') throw new PaymentError('Seule une facture émise peut recevoir un paiement.');

      const activePayments = await repo.activePaymentsForInvoice(db, invoiceId);
      const { remainingCents } = computePaymentAmounts(invoice.totalTtcCents, activePayments);
      if (remainingCents <= 0) throw new PaymentError('Cette facture est déjà intégralement payée.');
      if (input.amount > remainingCents) {
        throw new PaymentError(`Le montant dépasse le restant dû (${formatCents(remainingCents)}).`);
      }

      return repo.createPayment(db, {
        invoiceId,
        amountCents: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
      });
    });
  } catch (error) {
    // Une erreur Postgres avorte toute la transaction — impossible d'y
    // enchaîner une lecture de récupération. La course gagnée par une autre
    // transaction avec la même clé entre le check et l'INSERT se résout
    // donc dans une TRANSACTION SÉPARÉE, après coup.
    if (input.idempotencyKey && isUniqueViolation(error)) {
      const existing = await withTenant(ctx, (db) => repo.findByIdempotencyKey(db, input.idempotencyKey!));
      if (existing) return existing;
    }
    throw error;
  }
}

export async function listPayments(ctx: TenantContext, invoiceId: string) {
  return withTenant(ctx, (db) => repo.listPaymentsForInvoice(db, invoiceId));
}

export async function cancelPayment(ctx: TenantContext, paymentId: string, raw: unknown) {
  const { reason } = cancelPaymentInputSchema.parse(raw);
  return withTenant(ctx, async (db) => {
    const payment = await repo.getPayment(db, paymentId);
    if (!payment) throw new Error('Paiement introuvable dans cette organisation.');
    if (payment.cancelledAt) throw new PaymentError('Ce paiement est déjà annulé.');
    return repo.cancelPayment(db, paymentId, reason);
  });
}
