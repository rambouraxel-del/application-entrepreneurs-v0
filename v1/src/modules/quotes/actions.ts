'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import * as quoteService from './service';
import { quoteFormShouldNotContainOrganizationId } from './validation';

export type FormState = { error: string | null };

function firstZodMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Formulaire invalide';
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}

function readQuoteForm(formData: FormData) {
  quoteFormShouldNotContainOrganizationId(formData);
  return {
    clientId: formData.get('clientId'),
    validUntil: formData.get('validUntil') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  };
}

function readLineForm(formData: FormData) {
  return {
    description: formData.get('description'),
    unit: formData.get('unit') ?? undefined,
    quantity: formData.get('quantity'),
    unitPrice: formData.get('unitPrice'),
    vatRateBp: formData.get('vatRateBp'),
    discountPercent: formData.get('discountPercent') ?? undefined,
  };
}

function revalidateQuote(id: string, clientId?: string) {
  revalidatePath('/app/quotes');
  revalidatePath(`/app/quotes/${id}`);
  revalidatePath('/app');
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
}

export async function createQuoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  let quote;
  try {
    quote = await quoteService.createQuote(ctx, readQuoteForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateQuote(quote.id, quote.clientId);
  redirect(`/app/quotes/${quote.id}`);
}

export async function updateQuoteMetaAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    const quote = await quoteService.updateQuoteMeta(ctx, id, readQuoteForm(formData));
    revalidateQuote(id, quote.clientId);
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  return { error: null };
}

export async function deleteDraftQuoteAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await quoteService.deleteDraftQuote(ctx, id);
  revalidateQuote(id);
  redirect('/app/quotes');
}

export async function addLineAction(quoteId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await quoteService.addLine(ctx, quoteId, readLineForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateQuote(quoteId);
  return { error: null };
}

export async function updateLineAction(
  quoteId: string,
  lineId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await quoteService.updateLine(ctx, quoteId, lineId, readLineForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateQuote(quoteId);
  return { error: null };
}

export async function removeLineAction(quoteId: string, lineId: string): Promise<void> {
  const ctx = await requireTenantContext();
  await quoteService.removeLine(ctx, quoteId, lineId);
  revalidateQuote(quoteId);
}

export async function emitQuoteAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const quote = await quoteService.emitQuote(ctx, id);
  revalidateQuote(id, quote.clientId);
}

export async function acceptQuoteAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const quote = await quoteService.acceptQuote(ctx, id);
  revalidateQuote(id, quote.clientId);
}

export async function rejectQuoteAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const quote = await quoteService.rejectQuote(ctx, id);
  revalidateQuote(id, quote.clientId);
}

export async function expireQuoteAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const quote = await quoteService.expireQuote(ctx, id);
  revalidateQuote(id, quote.clientId);
}

export async function regeneratePdfAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await quoteService.regeneratePdf(ctx, id);
  revalidateQuote(id);
}
