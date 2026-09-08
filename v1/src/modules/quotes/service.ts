import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { todayInTimezone } from '@/lib/datetime';
import { assertClientBelongsToOrg, getClient } from '@/modules/clients/service';
import { getOrganization } from '@/modules/organizations/service';
import { allocateSequence, formatDocumentNumber } from '@/lib/numbering/allocate';
import { computeLine, computeDocumentTotals, type LineAmounts } from './calc';
import { quoteInputSchema, quoteLineInputSchema, MAX_QUOTE_LINES, type QuoteInput, type QuoteLineInput } from './validation';
import { resolveDocumentStorage, quoteDocumentPath } from '@/lib/storage/storage';
import { renderQuotePdf } from './pdf';
import * as repo from './repository';
import type { QuoteListFilter } from './repository';

/**
 * Service métier Quote — le premier workflow financier réel de la V1
 * (docs/v1/lot-3-devis.md). Toute mutation passe par ici, jamais directement
 * par le repository depuis une Server Action.
 *
 * Invariant absolu (Lot 0, non négociable) : aucun calcul financier ne
 * s'appuie sur un flottant JS. `calc.ts` (arithmétique entière, BigInt) est
 * la SEULE source de vérité des montants — le navigateur peut afficher un
 * total pour l'UX, mais chaque sauvegarde/émission recalcule tout côté
 * serveur à partir des lignes stockées.
 */

class QuoteStateError extends Error {}

function toLineAmounts(input: QuoteLineInput): LineAmounts {
  return computeLine({
    quantityMilli: input.quantity,
    unitPriceCents: input.unitPrice,
    vatRateBp: input.vatRateBp,
    discountBp: input.discountPercent,
  });
}

async function assertDraft(ctx: TenantContext, quoteId: string) {
  const quote = await withTenant(ctx, (db) => repo.getQuoteForUpdate(db, quoteId));
  if (!quote) throw new Error('Devis introuvable dans cette organisation.');
  if (quote.status !== 'draft') throw new QuoteStateError('Ce devis a déjà été émis : il ne peut plus être modifié.');
  return quote;
}

/** Recalcule et stocke les totaux à partir des lignes réellement en base — jamais une valeur transmise par le client. */
async function recomputeTotals(ctx: TenantContext, quoteId: string) {
  const lines = await withTenant(ctx, (db) => repo.listLines(db, quoteId));
  const totals = computeDocumentTotals(
    lines.map((l) => ({
      grossHtCents: l.grossHtCents,
      discountCents: l.discountCents,
      netHtCents: l.netHtCents,
      vatCents: l.vatCents,
      totalTtcCents: l.totalTtcCents,
      vatRateBp: l.vatRateBp,
    })),
  );
  await withTenant(ctx, (db) => repo.updateQuoteTotals(db, quoteId, totals));
  return totals;
}

export async function createQuote(ctx: TenantContext, raw: unknown) {
  const input: QuoteInput = quoteInputSchema.parse(raw);
  await assertClientBelongsToOrg(ctx, input.clientId);
  return withTenant(ctx, (db) => repo.createQuote(db, input.clientId, input.notes, input.validUntil));
}

export async function listQuotes(ctx: TenantContext, filter: QuoteListFilter = {}) {
  return withTenant(ctx, (db) => repo.listQuotes(db, filter));
}

export async function getQuote(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.getQuote(db, id));
}

export async function updateQuoteMeta(ctx: TenantContext, id: string, raw: unknown) {
  await assertDraft(ctx, id);
  const input: QuoteInput = quoteInputSchema.parse(raw);
  await assertClientBelongsToOrg(ctx, input.clientId);
  return withTenant(ctx, (db) =>
    repo.updateQuoteMeta(db, id, { clientId: input.clientId, notes: input.notes, validUntil: input.validUntil ?? null }),
  );
}

/** Un brouillon n'a encore aucune conséquence : suppression physique autorisée (rien n'y fait référence). */
export async function deleteDraftQuote(ctx: TenantContext, id: string) {
  await assertDraft(ctx, id);
  return withTenant(ctx, (db) => repo.deleteQuote(db, id));
}

// --- Lignes -------------------------------------------------------------

export async function addLine(ctx: TenantContext, quoteId: string, raw: unknown) {
  await assertDraft(ctx, quoteId);
  const input = quoteLineInputSchema.parse(raw);
  const existing = await withTenant(ctx, (db) => repo.listLines(db, quoteId));
  if (existing.length >= MAX_QUOTE_LINES) throw new Error(`Un devis ne peut pas dépasser ${MAX_QUOTE_LINES} lignes.`);
  const amounts = toLineAmounts(input);
  const position = await withTenant(ctx, (db) => repo.nextLinePosition(db, quoteId));
  await withTenant(ctx, (db) =>
    repo.createLine(
      db,
      quoteId,
      position,
      { description: input.description, unit: input.unit, quantityMilli: input.quantity, unitPriceCents: input.unitPrice, vatRateBp: input.vatRateBp, discountBp: input.discountPercent },
      amounts,
    ),
  );
  return recomputeTotals(ctx, quoteId);
}

export async function updateLine(ctx: TenantContext, quoteId: string, lineId: string, raw: unknown) {
  await assertDraft(ctx, quoteId);
  const input = quoteLineInputSchema.parse(raw);
  const amounts = toLineAmounts(input);
  await withTenant(ctx, (db) =>
    repo.updateLine(
      db,
      lineId,
      { description: input.description, unit: input.unit, quantityMilli: input.quantity, unitPriceCents: input.unitPrice, vatRateBp: input.vatRateBp, discountBp: input.discountPercent },
      amounts,
    ),
  );
  return recomputeTotals(ctx, quoteId);
}

export async function removeLine(ctx: TenantContext, quoteId: string, lineId: string) {
  await assertDraft(ctx, quoteId);
  await withTenant(ctx, (db) => repo.deleteLine(db, lineId));
  return recomputeTotals(ctx, quoteId);
}

// --- Émission -------------------------------------------------------------

/**
 * Transaction d'émission (docs/v1/lot-3-devis.md §Émission) :
 *   1. vérifier brouillon + au moins une ligne ;
 *   2. RECALCULER les montants côté serveur à partir des lignes en base
 *      (jamais une valeur transmise) ;
 *   3. charger Client + Organization, construire les snapshots ;
 *   4. allouer le numéro (compteur transactionnel, Lot 0) ;
 *   5. figer le document (une seule instruction `issueQuote`) ;
 *   6. commit — ou rollback complet en cas d'erreur, à n'importe quelle étape.
 *
 * Le PDF est généré et stocké APRÈS le commit (I/O non transactionnel, non
 * critique pour la validité légale/numérotation du devis) : un échec de
 * rendu PDF n'invalide pas l'émission, il reste régénérable
 * (`regeneratePdf`). `pdfPath`/`pdfSha256` sont explicitement exemptés du
 * trigger d'immutabilité pour permettre cette mise à jour a posteriori.
 */
export async function emitQuote(ctx: TenantContext, quoteId: string) {
  const quote = await assertDraft(ctx, quoteId);
  if (quote.lines.length === 0) throw new QuoteStateError('Un devis sans ligne ne peut pas être émis.');

  const totals = computeDocumentTotals(
    quote.lines.map((l) => ({
      grossHtCents: l.grossHtCents,
      discountCents: l.discountCents,
      netHtCents: l.netHtCents,
      vatCents: l.vatCents,
      totalTtcCents: l.totalTtcCents,
      vatRateBp: l.vatRateBp,
    })),
  );

  const client = await getClient(ctx, quote.clientId);
  if (!client) throw new Error('Client introuvable — émission impossible.');
  const organization = await getOrganization(ctx);

  const clientSnapshot = {
    id: client.id,
    kind: client.kind,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
  };
  // ⚑ À VALIDER JURIDIQUEMENT : Organization ne porte pas encore SIRET ni
  // adresse légale (hors périmètre Lot 1-3). Le snapshot ne contient que ce
  // qui existe réellement — pas de mention légale inventée.
  const organizationSnapshot = { id: organization.id, name: organization.name };

  const year = todayInTimezone().getUTCFullYear();
  const issued = await withTenant(ctx, async (db) => {
    const sequence = await allocateSequence(db, { organizationId: ctx.organizationId, docType: 'quote', year });
    const number = formatDocumentNumber({ year, sequence }, { prefix: 'DEV', includeYear: true, padding: 6 });
    return repo.issueQuote(db, quoteId, { number, clientSnapshot, organizationSnapshot, totals });
  });

  try {
    await generateAndStorePdf(ctx, quoteId);
  } catch (error) {
    // Le devis est déjà légalement émis (numéro alloué, snapshots figés) —
    // un échec de rendu PDF ne doit pas faire perdre ce numéro. Régénérable.
    console.error('Génération PDF du devis échouée (émission conservée) :', error);
  }

  return issued;
}

async function generateAndStorePdf(ctx: TenantContext, quoteId: string) {
  const quote = await withTenant(ctx, (db) => repo.getQuote(db, quoteId));
  if (!quote || !quote.issuedAt || !quote.number) return;
  const pdf = await renderQuotePdf(quote);
  const path = quoteDocumentPath(ctx.organizationId, quote.id);
  const { storage } = resolveDocumentStorage();
  const stored = await storage.put(path, pdf, 'application/pdf');
  await withTenant(ctx, (db) => repo.setQuotePdf(db, quoteId, stored.path, stored.sha256));
}

/** Régénère le PDF d'un devis déjà émis (ex. échec initial) — jamais pour un brouillon. */
export async function regeneratePdf(ctx: TenantContext, quoteId: string) {
  const quote = await getQuote(ctx, quoteId);
  if (!quote || !quote.issuedAt) throw new Error('Seul un devis émis a un PDF.');
  await generateAndStorePdf(ctx, quoteId);
}

async function assertSent(ctx: TenantContext, quoteId: string) {
  const quote = await withTenant(ctx, (db) => repo.getQuote(db, quoteId));
  if (!quote) throw new Error('Devis introuvable dans cette organisation.');
  if (quote.status !== 'sent') throw new QuoteStateError('Cette action nécessite un devis envoyé.');
  return quote;
}

export async function acceptQuote(ctx: TenantContext, quoteId: string) {
  await assertSent(ctx, quoteId);
  return withTenant(ctx, (db) => repo.setQuoteStatus(db, quoteId, 'accepted'));
}

export async function rejectQuote(ctx: TenantContext, quoteId: string) {
  await assertSent(ctx, quoteId);
  return withTenant(ctx, (db) => repo.setQuoteStatus(db, quoteId, 'rejected'));
}

/** Transition manuelle — pas de tâche planifiée (docs/v1/lot-3-devis.md §Statuts) : l'utilisateur ou une relecture du Dashboard la déclenche. */
export async function expireQuote(ctx: TenantContext, quoteId: string) {
  await assertSent(ctx, quoteId);
  return withTenant(ctx, (db) => repo.setQuoteStatus(db, quoteId, 'expired'));
}
