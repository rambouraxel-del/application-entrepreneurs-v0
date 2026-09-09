import type { TenantScopedClient } from '@/lib/db/withTenant';

/**
 * Accès aux données Payment — déjà scopé tenant par `withTenant` (extension +
 * RLS + trigger : seule une annulation est autorisée après création, jamais
 * une suppression — voir prisma/rls.sql).
 */

/** Verrouille la ligne Invoice pour la durée de la transaction — sérialise les paiements concurrents sur la même facture (§31). */
export async function lockInvoiceForPayment(db: TenantScopedClient, invoiceId: string): Promise<void> {
  await db.$queryRawUnsafe(`SELECT id FROM invoices WHERE id = $1::uuid FOR UPDATE`, invoiceId);
}

export function activePaymentsForInvoice(db: TenantScopedClient, invoiceId: string) {
  return db.payment.findMany({ where: { invoiceId, cancelledAt: null }, select: { amountCents: true, cancelledAt: true } });
}

export function findByIdempotencyKey(db: TenantScopedClient, idempotencyKey: string) {
  return db.payment.findFirst({ where: { idempotencyKey } });
}

export type PaymentWrite = {
  invoiceId: string;
  amountCents: number;
  paidAt: Date;
  method: string;
  reference?: string;
  note?: string;
  idempotencyKey?: string;
};

export function createPayment(db: TenantScopedClient, input: PaymentWrite) {
  return db.payment.create({ data: input as never });
}

export function listPaymentsForInvoice(db: TenantScopedClient, invoiceId: string) {
  return db.payment.findMany({ where: { invoiceId }, orderBy: { paidAt: 'desc' } });
}

export function getPayment(db: TenantScopedClient, id: string) {
  return db.payment.findUnique({ where: { id } });
}

export function cancelPayment(db: TenantScopedClient, id: string, reason: string) {
  return db.payment.update({ where: { id }, data: { cancelledAt: new Date(), cancellationReason: reason } });
}
