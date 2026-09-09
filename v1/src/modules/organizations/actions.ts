'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { toCents } from '@/lib/billing/calc';
import * as orgService from './service';

export type FormState = { error: string | null };

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l'organisation est requis").max(200),
  clientFollowUpDays: z.coerce.number().int().min(1, 'Doit être au moins 1 jour').max(365, 'Maximum 365 jours'),
  quoteFollowUpDays: z.coerce.number().int().min(1, 'Doit être au moins 1 jour').max(365, 'Maximum 365 jours'),
  quoteHighValueEuros: z
    .string()
    .trim()
    .transform((v, ctx) => {
      try {
        return toCents(v);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Montant invalide' });
        return z.NEVER;
      }
    })
    .refine((v) => v > 0, 'Le montant doit être positif'),
});

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  const parsed = settingsSchema.safeParse({
    name: formData.get('name'),
    clientFollowUpDays: formData.get('clientFollowUpDays'),
    quoteFollowUpDays: formData.get('quoteFollowUpDays'),
    quoteHighValueEuros: formData.get('quoteHighValueEuros'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }
  await orgService.renameOrganization(ctx, parsed.data.name);
  await orgService.updateClientFollowUpDays(ctx, parsed.data.clientFollowUpDays);
  await orgService.updateQuoteSettings(ctx, parsed.data.quoteFollowUpDays, parsed.data.quoteHighValueEuros);
  revalidatePath('/app/settings');
  revalidatePath('/app');
  revalidatePath('/app/clients');
  revalidatePath('/app/quotes');
  return { error: null };
}

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

const legalIdentitySchema = z.object({
  legalName: z.string().trim().min(1, 'La raison sociale est requise').max(200),
  tradeName: z.string().trim().max(200).optional().transform(emptyToUndefined),
  legalForm: z.string().trim().max(50).optional().transform(emptyToUndefined),
  siren: z.string().trim().regex(/^\d{9}$/, 'SIREN invalide (9 chiffres)').optional().or(z.literal('')).transform(emptyToUndefined),
  siret: z.string().trim().regex(/^\d{14}$/, 'SIRET invalide (14 chiffres)').optional().or(z.literal('')).transform(emptyToUndefined),
  vatNumber: z.string().trim().max(20).optional().transform(emptyToUndefined),
  addressLine1: z.string().trim().min(1, "L'adresse est requise").max(200),
  addressLine2: z.string().trim().max(200).optional().transform(emptyToUndefined),
  addressPostalCode: z.string().trim().min(1, 'Le code postal est requis').max(20),
  addressCity: z.string().trim().min(1, 'La ville est requise').max(120),
  addressCountry: z.string().trim().length(2, 'Code pays sur 2 lettres (ex. FR)').default('FR'),
  professionalEmail: z.string().trim().email('E-mail invalide').max(320).optional().or(z.literal('')).transform(emptyToUndefined),
  professionalPhone: z.string().trim().max(40).optional().transform(emptyToUndefined),
  vatRegime: z.enum(['normal', 'franchise_en_base']).default('normal'),
  vatOnDebits: z.coerce.boolean().default(false),
});

export async function updateLegalIdentityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  const parsed = legalIdentitySchema.safeParse({
    legalName: formData.get('legalName'),
    tradeName: formData.get('tradeName') ?? undefined,
    legalForm: formData.get('legalForm') ?? undefined,
    siren: formData.get('siren') ?? undefined,
    siret: formData.get('siret') ?? undefined,
    vatNumber: formData.get('vatNumber') ?? undefined,
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2') ?? undefined,
    addressPostalCode: formData.get('addressPostalCode'),
    addressCity: formData.get('addressCity'),
    addressCountry: formData.get('addressCountry') ?? 'FR',
    professionalEmail: formData.get('professionalEmail') ?? undefined,
    professionalPhone: formData.get('professionalPhone') ?? undefined,
    vatRegime: formData.get('vatRegime') ?? 'normal',
    vatOnDebits: formData.get('vatOnDebits') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  await orgService.updateLegalIdentity(ctx, parsed.data);
  revalidatePath('/app/settings');
  return { error: null };
}

const paymentTermsSchema = z.object({
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365),
  latePaymentPenaltyText: z.string().trim().min(1).max(500),
  earlyPaymentDiscountText: z.string().trim().min(1).max(500),
  latePaymentRecoveryFeeEuros: z
    .string()
    .trim()
    .transform((v, ctx) => {
      try {
        return toCents(v);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Montant invalide' });
        return z.NEVER;
      }
    })
    .refine((v) => v >= 0, 'Le montant ne peut pas être négatif'),
});

export async function updatePaymentTermsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  const parsed = paymentTermsSchema.safeParse({
    defaultPaymentTermDays: formData.get('defaultPaymentTermDays'),
    latePaymentPenaltyText: formData.get('latePaymentPenaltyText'),
    earlyPaymentDiscountText: formData.get('earlyPaymentDiscountText'),
    latePaymentRecoveryFeeEuros: formData.get('latePaymentRecoveryFeeEuros'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  await orgService.updatePaymentTerms(ctx, {
    defaultPaymentTermDays: parsed.data.defaultPaymentTermDays,
    latePaymentPenaltyText: parsed.data.latePaymentPenaltyText,
    earlyPaymentDiscountText: parsed.data.earlyPaymentDiscountText,
    latePaymentRecoveryFeeCents: parsed.data.latePaymentRecoveryFeeEuros,
  });
  revalidatePath('/app/settings');
  return { error: null };
}
