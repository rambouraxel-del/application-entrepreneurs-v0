import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { todayInTimezone } from '@/lib/datetime';
import { getClient } from '@/modules/clients/service';
import { getOrganization } from '@/modules/organizations/service';
import { getQuote } from '@/modules/quotes/service';
import { allocateSequence, formatDocumentNumber } from '@/lib/numbering/allocate';
import { computeLine, computeDocumentTotals, type LineAmounts } from '@/lib/billing/calc';
import { assertInvoiceIssuerReady, assertClientBillingReady } from './readiness';
import {
  invoiceMetaInputSchema,
  invoiceLineInputSchema,
  MAX_INVOICE_LINES,
  type InvoiceMetaInput,
  type InvoiceLineInput,
} from './validation';
import { resolveDocumentStorage, invoiceDocumentPath } from '@/lib/storage/storage';
import { renderInvoicePdf } from './pdf';
import * as repo from './repository';
import type { InvoiceListFilter } from './repository';

/**
 * Service métier Invoice (docs/v1/lot-4-factures-paiements.md). Réutilise
 * SANS MODIFICATION le calculateur financier (lib/billing/calc.ts) et le
 * mécanisme de numérotation (lib/numbering/allocate.ts, docType='invoice').
 *
 * Invariant absolu (hérité du Lot 0/3) : aucun calcul financier ne s'appuie
 * sur un flottant JS ; le navigateur n'est jamais source de vérité —
 * l'émission recalcule tout côté serveur.
 */

class InvoiceStateError extends Error {}

function toLineAmounts(input: InvoiceLineInput): LineAmounts {
  return computeLine({
    quantityMilli: input.quantity,
    unitPriceCents: input.unitPrice,
    vatRateBp: input.vatRateBp,
    discountBp: input.discountPercent,
  });
}

async function assertDraft(ctx: TenantContext, invoiceId: string) {
  const invoice = await withTenant(ctx, (db) => repo.getInvoiceForUpdate(db, invoiceId));
  if (!invoice) throw new Error('Facture introuvable dans cette organisation.');
  if (invoice.status !== 'draft') throw new InvoiceStateError('Cette facture a déjà été émise : elle ne peut plus être modifiée.');
  return invoice;
}

async function recomputeTotals(ctx: TenantContext, invoiceId: string) {
  const lines = await withTenant(ctx, (db) => repo.listLines(db, invoiceId));
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
  await withTenant(ctx, (db) => repo.updateInvoiceTotals(db, invoiceId, totals));
  return totals;
}

/**
 * Transformation Quote → Invoice (§8/§9/§10 du compte rendu).
 *
 * Disponible uniquement pour un devis `accepted`. Protection contre la
 * double transformation à DEUX niveaux : vérification applicative (message
 * clair) ET contrainte unique en base sur `sourceQuoteId` (le vrai garde-fou
 * sous concurrence — testé explicitement, tests/invoices.test.ts).
 *
 * Les lignes sont COPIÉES (jamais partagées avec QuoteLine) et recalculées
 * via le même calculateur — même montant garanti par construction, pas par
 * coïncidence.
 */
export async function transformQuoteToInvoice(ctx: TenantContext, quoteId: string) {
  const quote = await getQuote(ctx, quoteId);
  if (!quote) throw new Error('Devis introuvable dans cette organisation.');
  if (quote.status !== 'accepted') {
    throw new InvoiceStateError('Seul un devis accepté peut être transformé en facture.');
  }

  const organization = await getOrganization(ctx);
  const supplyDate = quote.issuedAt ?? todayInTimezone();
  const dueDate = new Date(supplyDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + organization.defaultPaymentTermDays);

  let invoice;
  try {
    invoice = await withTenant(ctx, (db) =>
      repo.createInvoiceFromQuote(db, { clientId: quote.clientId, sourceQuoteId: quote.id, supplyDate, dueDate }),
    );
  } catch (error) {
    // Contrainte unique (organization_id, source_quote_id implicite via @unique
    // sur sourceQuoteId) violée : une facture existe déjà pour ce devis —
    // c'est le garde-fou sous concurrence, pas une erreur applicative.
    if (isUniqueViolation(error)) {
      throw new InvoiceStateError('Une facture existe déjà pour ce devis.');
    }
    throw error;
  }

  const lines = quote.lines;
  await withTenant(ctx, async (db) => {
    let position = 1;
    for (const line of lines) {
      const amounts = computeLine({
        quantityMilli: line.quantityMilli,
        unitPriceCents: line.unitPriceCents,
        vatRateBp: line.vatRateBp,
        discountBp: line.discountBp,
      });
      await repo.createLine(
        db,
        invoice.id,
        position++,
        {
          description: line.description,
          unit: line.unit ?? undefined,
          quantityMilli: line.quantityMilli,
          unitPriceCents: line.unitPriceCents,
          vatRateBp: line.vatRateBp,
          discountBp: line.discountBp,
        },
        amounts,
      );
    }
  });
  await recomputeTotals(ctx, invoice.id);
  return withTenant(ctx, (db) => repo.getInvoice(db, invoice.id));
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

export async function listInvoices(ctx: TenantContext, filter: InvoiceListFilter = {}) {
  return withTenant(ctx, (db) => repo.listInvoices(db, filter));
}

export async function getInvoice(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.getInvoice(db, id));
}

export async function updateInvoiceMeta(ctx: TenantContext, id: string, raw: unknown) {
  await assertDraft(ctx, id);
  const input: InvoiceMetaInput = invoiceMetaInputSchema.parse(raw);
  return withTenant(ctx, (db) => repo.updateInvoiceMeta(db, id, input));
}

export async function deleteDraftInvoice(ctx: TenantContext, id: string) {
  await assertDraft(ctx, id);
  return withTenant(ctx, (db) => repo.deleteInvoice(db, id));
}

// --- Lignes -------------------------------------------------------------

export async function addLine(ctx: TenantContext, invoiceId: string, raw: unknown) {
  await assertDraft(ctx, invoiceId);
  const input = invoiceLineInputSchema.parse(raw);
  const existing = await withTenant(ctx, (db) => repo.listLines(db, invoiceId));
  if (existing.length >= MAX_INVOICE_LINES) throw new Error(`Une facture ne peut pas dépasser ${MAX_INVOICE_LINES} lignes.`);
  const amounts = toLineAmounts(input);
  const position = existing.length + 1;
  await withTenant(ctx, (db) =>
    repo.createLine(
      db,
      invoiceId,
      position,
      {
        description: input.description,
        unit: input.unit,
        quantityMilli: input.quantity,
        unitPriceCents: input.unitPrice,
        vatRateBp: input.vatRateBp,
        discountBp: input.discountPercent,
        vatExemptionCode: input.vatExemptionCode,
        vatLegalNotice: input.vatLegalNotice,
      },
      amounts,
    ),
  );
  return recomputeTotals(ctx, invoiceId);
}

export async function updateLine(ctx: TenantContext, invoiceId: string, lineId: string, raw: unknown) {
  await assertDraft(ctx, invoiceId);
  const input = invoiceLineInputSchema.parse(raw);
  const amounts = toLineAmounts(input);
  await withTenant(ctx, (db) =>
    repo.updateLine(
      db,
      lineId,
      {
        description: input.description,
        unit: input.unit,
        quantityMilli: input.quantity,
        unitPriceCents: input.unitPrice,
        vatRateBp: input.vatRateBp,
        discountBp: input.discountPercent,
        vatExemptionCode: input.vatExemptionCode,
        vatLegalNotice: input.vatLegalNotice,
      },
      amounts,
    ),
  );
  return recomputeTotals(ctx, invoiceId);
}

export async function removeLine(ctx: TenantContext, invoiceId: string, lineId: string) {
  await assertDraft(ctx, invoiceId);
  await withTenant(ctx, (db) => repo.deleteLine(db, lineId));
  return recomputeTotals(ctx, invoiceId);
}

// --- Émission -------------------------------------------------------------

/**
 * Transaction d'émission (§12 du compte rendu) : authentifier -> résoudre
 * tenant (fait par l'appelant) -> charger draft -> vérifier Client ->
 * vérifier Organization (invoice readiness) -> recalculer les lignes ->
 * calculer HT/TVA/TTC -> créer snapshots -> attribuer le numéro -> figer ->
 * commit. Aucun état partiellement émis (rollback testé, tests/invoices.test.ts).
 *
 * Le PDF est généré et stocké APRÈS le commit — §24 du compte rendu : ne
 * jamais tenir une transaction DB ouverte pendant un appel réseau Storage.
 * Un échec de rendu n'invalide pas l'émission (numéro déjà alloué,
 * légalement acquis) ; régénérable à l'identique depuis le snapshot.
 */
export async function emitInvoice(ctx: TenantContext, invoiceId: string) {
  const invoice = await assertDraft(ctx, invoiceId);
  if (invoice.lines.length === 0) throw new InvoiceStateError('Une facture sans ligne ne peut pas être émise.');

  const totals = computeDocumentTotals(
    invoice.lines.map((l) => ({
      grossHtCents: l.grossHtCents,
      discountCents: l.discountCents,
      netHtCents: l.netHtCents,
      vatCents: l.vatCents,
      totalTtcCents: l.totalTtcCents,
      vatRateBp: l.vatRateBp,
    })),
  );

  const organization = await getOrganization(ctx);
  assertInvoiceIssuerReady(organization);
  const client = await getClient(ctx, invoice.clientId);
  if (!client) throw new Error('Client introuvable — émission impossible.');
  assertClientBillingReady(client);

  const issuerSnapshot = {
    legalName: organization.legalName,
    tradeName: organization.tradeName,
    legalForm: organization.legalForm,
    siren: organization.siren,
    siret: organization.siret,
    vatNumber: organization.vatNumber,
    vatRegime: organization.vatRegime,
    address: {
      line1: organization.addressLine1,
      line2: organization.addressLine2,
      postalCode: organization.addressPostalCode,
      city: organization.addressCity,
      country: organization.addressCountry,
    },
    email: organization.professionalEmail,
    phone: organization.professionalPhone,
  };
  const billingName = client.kind === 'company' ? client.billingLegalName || client.companyName : client.name;
  const clientSnapshot = {
    kind: client.kind,
    name: billingName,
    email: client.billingEmail || client.email,
    siren: client.siren,
    vatNumber: client.vatNumber,
    billingAddress: {
      line1: client.billingAddressLine1,
      line2: client.billingAddressLine2,
      postalCode: client.billingAddressPostalCode,
      city: client.billingAddressCity,
      country: client.billingAddressCountry,
    },
    // Adresse de livraison uniquement si réellement différente (mention
    // devenue obligatoire au 1ᵉʳ septembre 2026 dans ce cas — economie.gouv.fr).
    deliveryAddress: client.deliveryAddressLine1
      ? {
          line1: client.deliveryAddressLine1,
          line2: client.deliveryAddressLine2,
          postalCode: client.deliveryAddressPostalCode,
          city: client.deliveryAddressCity,
          country: client.deliveryAddressCountry,
        }
      : null,
  };
  const paymentTermsSnapshot = {
    dueDate: invoice.dueDate,
    latePaymentPenaltyText: organization.latePaymentPenaltyText,
    earlyPaymentDiscountText: organization.earlyPaymentDiscountText,
    latePaymentRecoveryFeeCents: organization.latePaymentRecoveryFeeCents,
  };

  const year = todayInTimezone().getUTCFullYear();
  const issued = await withTenant(ctx, async (db) => {
    const sequence = await allocateSequence(db, { organizationId: ctx.organizationId, docType: 'invoice', year });
    const number = formatDocumentNumber({ year, sequence }, { prefix: 'FAC', includeYear: true, padding: 6 });
    return repo.issueInvoice(db, invoiceId, {
      number,
      issuerSnapshot,
      clientSnapshot,
      paymentTermsSnapshot,
      vatOnDebits: organization.vatOnDebits,
      totals,
    });
  });

  try {
    await generateAndStorePdf(ctx, invoiceId);
  } catch (error) {
    console.error('Génération PDF de la facture échouée (émission conservée) :', error);
  }

  return issued;
}

async function generateAndStorePdf(ctx: TenantContext, invoiceId: string) {
  const invoice = await withTenant(ctx, (db) => repo.getInvoice(db, invoiceId));
  if (!invoice || !invoice.issuedAt || !invoice.number) return;
  const pdf = await renderInvoicePdf(invoice);
  const path = invoiceDocumentPath(ctx.organizationId, invoice.id);
  const { storage } = resolveDocumentStorage();
  const stored = await storage.put(path, pdf, 'application/pdf');
  await withTenant(ctx, (db) => repo.setInvoicePdf(db, invoiceId, stored.path, stored.sha256));
}

export async function regeneratePdf(ctx: TenantContext, invoiceId: string) {
  const invoice = await getInvoice(ctx, invoiceId);
  if (!invoice || !invoice.issuedAt) throw new Error('Seule une facture émise a un PDF.');
  await generateAndStorePdf(ctx, invoiceId);
}
