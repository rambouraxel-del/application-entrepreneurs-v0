import type { TenantScopedClient } from '@/lib/db/withTenant';
import type { LineAmounts, DocumentTotals } from '@/lib/billing/calc';
import type { InvoiceStatus } from '../../../generated/prisma/index';

/**
 * Accès aux données Invoice/InvoiceLine — même principe que quotes/repository.ts :
 * aucune règle métier ici, déjà scopé tenant par `withTenant` (extension +
 * RLS + trigger d'immutabilité en base).
 */

export function createInvoiceFromQuote(
  db: TenantScopedClient,
  data: { clientId: string; sourceQuoteId: string; supplyDate: Date; dueDate: Date },
) {
  return db.invoice.create({ data: data as never });
}

export type InvoiceListFilter = { status?: InvoiceStatus; clientId?: string };

export function listInvoices(db: TenantScopedClient, filter: InvoiceListFilter = {}) {
  return db.invoice.findMany({
    where: { status: filter.status, clientId: filter.clientId },
    include: { client: { select: { id: true, name: true } }, payments: { select: { amountCents: true, cancelledAt: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export function getInvoice(db: TenantScopedClient, id: string) {
  return db.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      lines: { orderBy: { position: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
      sourceQuote: { select: { id: true, number: true } },
    },
  });
}

export function getInvoiceForUpdate(db: TenantScopedClient, id: string) {
  return db.invoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: 'asc' } } } });
}

export function updateInvoiceMeta(
  db: TenantScopedClient,
  id: string,
  data: { supplyDate?: Date; dueDate?: Date; operationCategory?: string; purchaseOrderNumber?: string; notes?: string },
) {
  return db.invoice.update({ where: { id }, data: data as never });
}

export function updateInvoiceTotals(db: TenantScopedClient, id: string, totals: DocumentTotals) {
  return db.invoice.update({
    where: { id },
    data: {
      totalHtCents: totals.totalHtCents,
      totalVatCents: totals.totalVatCents,
      totalTtcCents: totals.totalTtcCents,
      vatBreakdown: totals.vatBreakdown as never,
    },
  });
}

export function deleteInvoice(db: TenantScopedClient, id: string) {
  return db.invoice.delete({ where: { id } });
}

export function setInvoicePdf(db: TenantScopedClient, id: string, pdfPath: string, pdfSha256: string) {
  return db.invoice.update({ where: { id }, data: { pdfPath, pdfSha256 } });
}

export function issueInvoice(
  db: TenantScopedClient,
  id: string,
  data: {
    number: string;
    issuerSnapshot: unknown;
    clientSnapshot: unknown;
    paymentTermsSnapshot: unknown;
    vatOnDebits: boolean;
    totals: DocumentTotals;
  },
) {
  return db.invoice.update({
    where: { id },
    data: {
      number: data.number,
      status: 'issued',
      issuedAt: new Date(),
      issuerSnapshot: data.issuerSnapshot as never,
      clientSnapshot: data.clientSnapshot as never,
      paymentTermsSnapshot: data.paymentTermsSnapshot as never,
      vatOnDebits: data.vatOnDebits,
      totalHtCents: data.totals.totalHtCents,
      totalVatCents: data.totals.totalVatCents,
      totalTtcCents: data.totals.totalTtcCents,
      vatBreakdown: data.totals.vatBreakdown as never,
    },
  });
}

// --- Lignes -----------------------------------------------------------

export function listLines(db: TenantScopedClient, invoiceId: string) {
  return db.invoiceLine.findMany({ where: { invoiceId }, orderBy: { position: 'asc' } });
}

export type InvoiceLineWrite = {
  description: string;
  unit?: string;
  quantityMilli: number;
  unitPriceCents: number;
  vatRateBp: number;
  discountBp: number;
  vatExemptionCode?: string;
  vatLegalNotice?: string;
};

export function createLine(
  db: TenantScopedClient,
  invoiceId: string,
  position: number,
  input: InvoiceLineWrite,
  amounts: LineAmounts,
) {
  return db.invoiceLine.create({
    data: {
      invoiceId,
      position,
      ...input,
      grossHtCents: amounts.grossHtCents,
      discountCents: amounts.discountCents,
      netHtCents: amounts.netHtCents,
      vatCents: amounts.vatCents,
      totalTtcCents: amounts.totalTtcCents,
    } as never,
  });
}

export function updateLine(db: TenantScopedClient, lineId: string, input: InvoiceLineWrite, amounts: LineAmounts) {
  return db.invoiceLine.update({
    where: { id: lineId },
    data: {
      ...input,
      grossHtCents: amounts.grossHtCents,
      discountCents: amounts.discountCents,
      netHtCents: amounts.netHtCents,
      vatCents: amounts.vatCents,
      totalTtcCents: amounts.totalTtcCents,
    } as never,
  });
}

export function deleteLine(db: TenantScopedClient, lineId: string) {
  return db.invoiceLine.delete({ where: { id: lineId } });
}
