'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import * as invoiceService from './service';

export type FormState = { error: string | null };

function firstZodMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Formulaire invalide';
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}

function readMetaForm(formData: FormData) {
  return {
    supplyDate: formData.get('supplyDate'),
    dueDate: formData.get('dueDate'),
    operationCategory: formData.get('operationCategory') ?? 'services',
    purchaseOrderNumber: formData.get('purchaseOrderNumber') ?? undefined,
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
    vatExemptionCode: formData.get('vatExemptionCode') ?? undefined,
    vatLegalNotice: formData.get('vatLegalNotice') ?? undefined,
  };
}

function revalidateInvoice(id: string, clientId?: string) {
  revalidatePath('/app/invoices');
  revalidatePath(`/app/invoices/${id}`);
  revalidatePath('/app');
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
}

/** Devis accepted -> facture brouillon (§8/§36). Redirige vers la facture existante si déjà transformée. */
export async function createInvoiceFromQuoteAction(quoteId: string): Promise<void> {
  const ctx = await requireTenantContext();
  const invoice = await invoiceService.transformQuoteToInvoice(ctx, quoteId);
  revalidateInvoice(invoice!.id, invoice!.clientId);
  revalidatePath(`/app/quotes/${quoteId}`);
  redirect(`/app/invoices/${invoice!.id}`);
}

export async function updateInvoiceMetaAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    const invoice = await invoiceService.updateInvoiceMeta(ctx, id, readMetaForm(formData));
    revalidateInvoice(id, invoice.clientId);
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  return { error: null };
}

export async function deleteDraftInvoiceAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await invoiceService.deleteDraftInvoice(ctx, id);
  revalidateInvoice(id);
  redirect('/app/invoices');
}

export async function addInvoiceLineAction(invoiceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await invoiceService.addLine(ctx, invoiceId, readLineForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateInvoice(invoiceId);
  return { error: null };
}

export async function updateInvoiceLineAction(
  invoiceId: string,
  lineId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await invoiceService.updateLine(ctx, invoiceId, lineId, readLineForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidateInvoice(invoiceId);
  return { error: null };
}

export async function removeInvoiceLineAction(invoiceId: string, lineId: string): Promise<void> {
  const ctx = await requireTenantContext();
  await invoiceService.removeLine(ctx, invoiceId, lineId);
  revalidateInvoice(invoiceId);
}

export async function emitInvoiceAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const invoice = await invoiceService.emitInvoice(ctx, id);
  revalidateInvoice(id, invoice.clientId);
}

export async function regenerateInvoicePdfAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await invoiceService.regeneratePdf(ctx, id);
  revalidateInvoice(id);
}
