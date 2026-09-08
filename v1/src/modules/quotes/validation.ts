import { z } from 'zod';
import { toCents, toQuantityMilli } from './calc';

/** Validation SERVEUR — la seule qui fasse autorité (docs/v1/architecture.md §18). */

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
export const QUOTE_STATUS_LABELS: Record<(typeof QUOTE_STATUSES)[number], string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
};

/** Taux de TVA français courants — évite un champ libre source d'erreurs de saisie. */
export const VAT_RATES_BP = [0, 550, 1000, 2000] as const;
export const VAT_RATE_LABELS: Record<number, string> = { 0: '0 %', 550: '5,5 %', 1000: '10 %', 2000: '20 %' };

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

function parsedNumber<T>(parse: (v: string) => T, message: string) {
  return z
    .string()
    .trim()
    .transform((val, ctx) => {
      try {
        return parse(val);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
    });
}

export const quoteInputSchema = z.object({
  clientId: z.string().trim().uuid('Client requis'),
  validUntil: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined)
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), 'Date de validité invalide')
    .transform((v) => (v ? new Date(v) : undefined)),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes trop longues (2000 caractères max)')
    .optional()
    .transform(emptyToUndefined),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

/** Une ligne : bornes raisonnables pour éviter des saisies absurdes (docs/v1/lot-3-devis.md §Validation). */
export const quoteLineInputSchema = z.object({
  description: z.string().trim().min(1, 'La description est requise').max(500, 'Description trop longue (500 caractères max)'),
  unit: z.string().trim().max(20, 'Unité trop longue').optional().or(z.literal('')).transform(emptyToUndefined),
  quantity: parsedNumber(toQuantityMilli, 'Quantité invalide')
    .refine((v) => v > 0, 'La quantité doit être positive')
    .refine((v) => v <= 1_000_000_000, 'Quantité déraisonnablement grande'),
  unitPrice: parsedNumber(toCents, 'Prix unitaire invalide')
    .refine((v) => v >= 0, 'Le prix unitaire ne peut pas être négatif')
    .refine((v) => v <= 100_000_000_00, 'Prix unitaire déraisonnablement grand'), // 100 M€
  vatRateBp: z.coerce
    .number()
    .int()
    .refine((v) => (VAT_RATES_BP as readonly number[]).includes(v), 'Taux de TVA invalide'),
  discountPercent: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined)
    .refine((v) => v === undefined || /^\d{1,3}(?:[.,]\d{1,2})?$/.test(v), 'Remise invalide')
    .transform((v) => (v ? Math.round(Number(v.replace(',', '.')) * 100) : 0))
    .refine((v) => v >= 0 && v <= 10_000, 'La remise doit être comprise entre 0 et 100 %'),
});
export type QuoteLineInput = z.infer<typeof quoteLineInputSchema>;

/** Rejette explicitement toute tentative d'imposer une organisation depuis le formulaire. */
export const quoteFormShouldNotContainOrganizationId = (formData: FormData) => {
  if (formData.get('organizationId') !== null) {
    throw new Error(
      "Champ organizationId reçu depuis un formulaire : l'organisation est toujours dérivée du contexte serveur, jamais du client.",
    );
  }
};

/** Nombre de lignes maximum par devis — limite raisonnable, pas un tableur. */
export const MAX_QUOTE_LINES = 100;
