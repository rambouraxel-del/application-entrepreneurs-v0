import type { TenantScopedClient } from '@/lib/db/withTenant';
import type { LineAmounts, DocumentTotals } from './calc';
import type { QuoteStatus } from '../../../generated/prisma/index';

/**
 * Accès aux données Quote/QuoteLine — aucune règle métier ici, uniquement des
 * requêtes déjà scopées tenant par `withTenant` (extension + RLS + trigger
 * d'immutabilité en base). Un service ne doit jamais importer Prisma
 * directement.
 */

export function createQuote(db: TenantScopedClient, clientId: string, notes?: string, validUntil?: Date) {
  return db.quote.create({ data: { clientId, notes, validUntil } as never });
}

export type QuoteListFilter = { status?: QuoteStatus; clientId?: string };

export function listQuotes(db: TenantScopedClient, filter: QuoteListFilter = {}) {
  return db.quote.findMany({
    where: { status: filter.status, clientId: filter.clientId },
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export function getQuote(db: TenantScopedClient, id: string) {
  return db.quote.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } }, lines: { orderBy: { position: 'asc' } } },
  });
}

export function getQuoteForUpdate(db: TenantScopedClient, id: string) {
  return db.quote.findUnique({ where: { id }, include: { lines: { orderBy: { position: 'asc' } } } });
}

export function updateQuoteMeta(
  db: TenantScopedClient,
  id: string,
  data: { clientId?: string; notes?: string; validUntil?: Date | null },
) {
  return db.quote.update({ where: { id }, data: data as never });
}

/** Totaux stockés = somme des lignes déjà arrondies (docs/v1/architecture.md §8) — jamais recalculés par formule. */
export function updateQuoteTotals(db: TenantScopedClient, id: string, totals: DocumentTotals) {
  return db.quote.update({
    where: { id },
    data: {
      totalHtCents: totals.totalHtCents,
      totalVatCents: totals.totalVatCents,
      totalTtcCents: totals.totalTtcCents,
      vatBreakdown: totals.vatBreakdown as never,
    },
  });
}

export function deleteQuote(db: TenantScopedClient, id: string) {
  return db.quote.delete({ where: { id } });
}

export function setQuoteStatus(db: TenantScopedClient, id: string, status: QuoteStatus) {
  return db.quote.update({ where: { id }, data: { status } });
}

export function setQuotePdf(db: TenantScopedClient, id: string, pdfPath: string, pdfSha256: string) {
  return db.quote.update({ where: { id }, data: { pdfPath, pdfSha256 } });
}

/**
 * Émission — une seule instruction, dans la transaction appelante : pose
 * numéro + snapshots + totaux + statut en même temps. C'est la ligne que le
 * trigger `quotes_protect_issued` observe (issued_at NULL -> posé) : tout se
 * joue ici, jamais en plusieurs UPDATE successifs.
 */
export function issueQuote(
  db: TenantScopedClient,
  id: string,
  data: {
    number: string;
    clientSnapshot: unknown;
    organizationSnapshot: unknown;
    totals: DocumentTotals;
  },
) {
  return db.quote.update({
    where: { id },
    data: {
      number: data.number,
      status: 'sent',
      issuedAt: new Date(),
      clientSnapshot: data.clientSnapshot as never,
      organizationSnapshot: data.organizationSnapshot as never,
      totalHtCents: data.totals.totalHtCents,
      totalVatCents: data.totals.totalVatCents,
      totalTtcCents: data.totals.totalTtcCents,
      vatBreakdown: data.totals.vatBreakdown as never,
    },
  });
}

// --- Lignes -----------------------------------------------------------

export function listLines(db: TenantScopedClient, quoteId: string) {
  return db.quoteLine.findMany({ where: { quoteId }, orderBy: { position: 'asc' } });
}

export async function nextLinePosition(db: TenantScopedClient, quoteId: string): Promise<number> {
  const last = await db.quoteLine.findFirst({ where: { quoteId }, orderBy: { position: 'desc' }, select: { position: true } });
  return (last?.position ?? 0) + 1;
}

export function createLine(
  db: TenantScopedClient,
  quoteId: string,
  position: number,
  input: { description: string; unit?: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; discountBp: number },
  amounts: LineAmounts,
) {
  return db.quoteLine.create({
    data: {
      quoteId,
      position,
      description: input.description,
      unit: input.unit,
      quantityMilli: input.quantityMilli,
      unitPriceCents: input.unitPriceCents,
      vatRateBp: input.vatRateBp,
      discountBp: input.discountBp,
      grossHtCents: amounts.grossHtCents,
      discountCents: amounts.discountCents,
      netHtCents: amounts.netHtCents,
      vatCents: amounts.vatCents,
      totalTtcCents: amounts.totalTtcCents,
    } as never,
  });
}

export function updateLine(
  db: TenantScopedClient,
  lineId: string,
  input: { description: string; unit?: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; discountBp: number },
  amounts: LineAmounts,
) {
  return db.quoteLine.update({
    where: { id: lineId },
    data: {
      description: input.description,
      unit: input.unit,
      quantityMilli: input.quantityMilli,
      unitPriceCents: input.unitPriceCents,
      vatRateBp: input.vatRateBp,
      discountBp: input.discountBp,
      grossHtCents: amounts.grossHtCents,
      discountCents: amounts.discountCents,
      netHtCents: amounts.netHtCents,
      vatCents: amounts.vatCents,
      totalTtcCents: amounts.totalTtcCents,
    } as never,
  });
}

export function deleteLine(db: TenantScopedClient, lineId: string) {
  return db.quoteLine.delete({ where: { id: lineId } });
}

export function getLine(db: TenantScopedClient, lineId: string) {
  return db.quoteLine.findUnique({ where: { id: lineId } });
}
