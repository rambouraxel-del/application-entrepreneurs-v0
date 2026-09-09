/**
 * Statut de paiement — axe ORTHOGONAL au cycle documentaire de la facture
 * (docs/v1/lot-4-factures-paiements.md §12/§28). `Invoice.status` ne connaît
 * que `draft | issued` ; `unpaid/partial/paid/overdue` est calculé ici,
 * JAMAIS stocké — même principe que le statut affiché déjà spécifié par
 * architecture.md §9.1 pour les factures.
 *
 * Le montant payé n'est pas non plus stocké (ADR-19, voir schema.prisma) :
 * `computePaymentAmounts` le dérive de la liste des paiements ACTIFS
 * (non annulés) passée en entrée — jamais une deuxième vérité.
 */

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export type PaymentLike = { amountCents: number; cancelledAt: Date | null };

export type PaymentAmounts = {
  paidCents: number;
  remainingCents: number;
};

/** Somme des paiements actifs (non annulés) — la seule vérité sur le montant payé. */
export function computePaymentAmounts(totalTtcCents: number, payments: PaymentLike[]): PaymentAmounts {
  const paidCents = payments.filter((p) => p.cancelledAt === null).reduce((sum, p) => sum + p.amountCents, 0);
  return { paidCents, remainingCents: totalTtcCents - paidCents };
}

/**
 * Définitions explicites (§41 du compte rendu) :
 *   - `unpaid`   : facture émise, aucun paiement actif.
 *   - `partial`  : facture émise, 0 < payé < total.
 *   - `paid`     : facture émise, payé >= total.
 *   - `overdue`  : facture émise, remaining > 0 ET dueDate < aujourd'hui —
 *     prioritaire sur unpaid/partial (une facture en retard n'est jamais
 *     affichée comme simplement "non payée").
 */
export function derivePaymentStatus(params: {
  issuedAt: Date | null;
  dueDate: Date;
  totalTtcCents: number;
  payments: PaymentLike[];
  today: Date;
}): PaymentStatus | null {
  if (!params.issuedAt) return null; // brouillon : pas de statut de paiement
  const { remainingCents } = computePaymentAmounts(params.totalTtcCents, params.payments);
  if (remainingCents <= 0) return 'paid';
  if (params.dueDate.getTime() < params.today.getTime()) return 'overdue';
  const { paidCents } = computePaymentAmounts(params.totalTtcCents, params.payments);
  return paidCents > 0 ? 'partial' : 'unpaid';
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Non payée',
  partial: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
};
