import { z } from 'zod';
import { VAT_RATES_BP, VAT_RATE_LABELS, toCents, toQuantityMilli } from '@/lib/billing/calc';

/** Réexportés — même liste que Quote (Lot 4 §19, un seul calculateur/une seule liste de taux). */
export { VAT_RATES_BP, VAT_RATE_LABELS };

export const OPERATION_CATEGORIES = ['goods', 'services', 'mixed'] as const;
export const OPERATION_CATEGORY_LABELS: Record<(typeof OPERATION_CATEGORIES)[number], string> = {
  goods: 'Biens',
  services: 'Prestations de services',
  mixed: 'Biens et services',
};

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

/** Brouillon uniquement — le client, lui, vient toujours du devis d'origine (§8 : pas de facture manuelle au Lot 4). */
export const invoiceMetaInputSchema = z.object({
  supplyDate: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Date de vente/prestation invalide')
    .transform((v) => new Date(v)),
  dueDate: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date d'échéance invalide")
    .transform((v) => new Date(v)),
  operationCategory: z.enum(OPERATION_CATEGORIES).default('services'),
  purchaseOrderNumber: z.string().trim().max(100).optional().transform(emptyToUndefined),
  notes: z.string().trim().max(2000).optional().transform(emptyToUndefined),
});
export type InvoiceMetaInput = z.infer<typeof invoiceMetaInputSchema>;

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

export const MAX_INVOICE_LINES = 100;

export const invoiceLineInputSchema = z.object({
  description: z.string().trim().min(1, 'La description est requise').max(500, 'Description trop longue (500 caractères max)'),
  unit: z.string().trim().max(20).optional().or(z.literal('')).transform(emptyToUndefined),
  quantity: parsedNumber(toQuantityMilli, 'Quantité invalide')
    .refine((v) => v > 0, 'La quantité doit être positive')
    .refine((v) => v <= 1_000_000_000, 'Quantité déraisonnablement grande'),
  unitPrice: parsedNumber(toCents, 'Prix unitaire invalide')
    .refine((v) => v >= 0, 'Le prix unitaire ne peut pas être négatif')
    .refine((v) => v <= 100_000_000_00, 'Prix unitaire déraisonnablement grand'),
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
  /**
   * Motif d'exonération — requis quand `vatRateBp = 0` ET que le régime de
   * l'organisation n'est pas déjà en franchise en base (auquel cas la
   * mention est posée automatiquement par le service, pas ligne par ligne).
   */
  vatExemptionCode: z.string().trim().max(50).optional().or(z.literal('')).transform(emptyToUndefined),
  vatLegalNotice: z.string().trim().max(300).optional().or(z.literal('')).transform(emptyToUndefined),
});
export type InvoiceLineInput = z.infer<typeof invoiceLineInputSchema>;

export const invoiceFormShouldNotContainOrganizationId = (formData: FormData) => {
  if (formData.get('organizationId') !== null) {
    throw new Error(
      "Champ organizationId reçu depuis un formulaire : l'organisation est toujours dérivée du contexte serveur, jamais du client.",
    );
  }
};
