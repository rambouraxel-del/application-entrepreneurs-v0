'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { toCents } from '@/modules/quotes/calc';
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
