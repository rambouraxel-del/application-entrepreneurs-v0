'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import * as paymentService from './service';

export type FormState = { error: string | null };

function firstZodMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Formulaire invalide';
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}

function revalidateInvoice(invoiceId: string) {
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath('/app/invoices');
  revalidatePath('/app');
}

export async function recordPaymentAction(invoiceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await paymentService.recordPayment(ctx, invoiceId, {
      amount: formData.get('amount'),
      paidAt: formData.get('paidAt'),
      method: formData.get('method') ?? 'bank_transfer',
      reference: formData.get('reference') ?? undefined,
      note: formData.get('note') ?? undefined,
      idempotencyKey: formData.get('idempotencyKey') ?? undefined,
    });
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateInvoice(invoiceId);
  return { error: null };
}

/**
 * Action de formulaire simple (pas useActionState) : petit formulaire
 * inline, l'erreur éventuelle (motif vide, déjà annulé) remonte via
 * l'exception Next.js standard plutôt qu'un état dédié — acceptable pour
 * cette action secondaire, cohérent avec les autres actions "void" du
 * projet (ex. removeLineAction).
 */
export async function cancelPaymentAction(invoiceId: string, paymentId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  await paymentService.cancelPayment(ctx, paymentId, { reason: formData.get('reason') });
  revalidateInvoice(invoiceId);
}
