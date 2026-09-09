import { z } from 'zod';
import { toCents } from '@/lib/billing/calc';

export const PAYMENT_METHODS = ['bank_transfer', 'card', 'cash', 'check', 'direct_debit', 'other'] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  bank_transfer: 'Virement',
  card: 'Carte',
  cash: 'Espèces',
  check: 'Chèque',
  direct_debit: 'Prélèvement',
  other: 'Autre',
};

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

export const paymentInputSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((val, ctx) => {
      try {
        return toCents(val);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Montant invalide' });
        return z.NEVER;
      }
    })
    .refine((v) => v > 0, 'Le montant doit être positif'),
  paidAt: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide')
    .transform((v) => new Date(v)),
  method: z.enum(PAYMENT_METHODS).default('bank_transfer'),
  reference: z.string().trim().max(100).optional().transform(emptyToUndefined),
  note: z.string().trim().max(500).optional().transform(emptyToUndefined),
  /** Anti double-clic (§32) — un identifiant stable généré une fois par rendu de formulaire, transmis dans un champ caché. */
  idempotencyKey: z.string().trim().max(100).optional().or(z.literal('')).transform(emptyToUndefined),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const cancelPaymentInputSchema = z.object({
  reason: z.string().trim().min(1, "Le motif d'annulation est requis").max(500),
});
