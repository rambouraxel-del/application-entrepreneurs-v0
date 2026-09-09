import type { EInvoiceAddress, EInvoicePayload } from './port';

/**
 * Mapping pur — Invoice émise (snapshots + lignes déjà figés) vers le
 * payload provider-neutral (§45). Aucune dépendance DB/réseau : testable
 * isolément (tests/einvoicing.test.ts).
 */

type Address = { line1: string | null; line2: string | null; postalCode: string | null; city: string | null; country: string | null };
type IssuerSnapshot = {
  legalName: string | null; siren: string | null; siret: string | null; vatNumber: string | null; address: Address;
};
type ClientSnapshot = {
  name: string | null; siren: string | null; vatNumber: string | null; billingAddress: Address; deliveryAddress: Address | null;
};
type LineForMapping = {
  description: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; vatExemptionCode: string | null;
  netHtCents: number; vatCents: number;
};

function mapAddress(a: Address): EInvoiceAddress {
  return { line1: a.line1, line2: a.line2, postalCode: a.postalCode, city: a.city, country: a.country };
}

export function buildEInvoicePayload(invoice: {
  id: string;
  number: string;
  issuedAt: Date;
  supplyDate: Date;
  dueDate: Date;
  operationCategory: 'goods' | 'services' | 'mixed';
  purchaseOrderNumber: string | null;
  issuerSnapshot: IssuerSnapshot;
  clientSnapshot: ClientSnapshot;
  lines: LineForMapping[];
  totalHtCents: number;
  totalVatCents: number;
  totalTtcCents: number;
}): EInvoicePayload {
  return {
    invoiceId: invoice.id,
    number: invoice.number,
    issuedAt: invoice.issuedAt.toISOString(),
    supplyDate: invoice.supplyDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    operationCategory: invoice.operationCategory,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    seller: {
      siren: invoice.issuerSnapshot.siren,
      siret: invoice.issuerSnapshot.siret,
      vatNumber: invoice.issuerSnapshot.vatNumber,
      legalName: invoice.issuerSnapshot.legalName,
      address: mapAddress(invoice.issuerSnapshot.address),
    },
    buyer: {
      siren: invoice.clientSnapshot.siren,
      vatNumber: invoice.clientSnapshot.vatNumber,
      name: invoice.clientSnapshot.name,
      billingAddress: mapAddress(invoice.clientSnapshot.billingAddress),
      deliveryAddress: invoice.clientSnapshot.deliveryAddress ? mapAddress(invoice.clientSnapshot.deliveryAddress) : null,
    },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantityMilli: l.quantityMilli,
      unitPriceCents: l.unitPriceCents,
      vatRateBp: l.vatRateBp,
      vatExemptionCode: l.vatExemptionCode,
      netHtCents: l.netHtCents,
      vatCents: l.vatCents,
    })),
    totals: { totalHtCents: invoice.totalHtCents, totalVatCents: invoice.totalVatCents, totalTtcCents: invoice.totalTtcCents },
  };
}
