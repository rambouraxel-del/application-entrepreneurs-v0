import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { formatCents } from '@/lib/billing/calc';

/**
 * Gabarit PDF de la facture — même architecture éprouvée que le devis (Lot 3,
 * porté du spike Lot 0). Rendu à partir des SNAPSHOTS figés à l'émission,
 * jamais depuis l'état courant d'Organization/Client.
 *
 * ⚠️ Ne prétend PAS "facture légalement conforme" — voir
 * docs/v1/lot-4-factures-paiements.md §18/§23 : les mentions affichées ici
 * couvrent ce qui est structuré dans le modèle, une validation juridique
 * complète reste à faire avant tout usage commercial réel.
 */

type Address = { line1: string | null; line2: string | null; postalCode: string | null; city: string | null; country: string | null };
type IssuerSnapshot = {
  legalName: string | null; tradeName: string | null; legalForm: string | null;
  siren: string | null; siret: string | null; vatNumber: string | null; vatRegime: string;
  address: Address; email: string | null; phone: string | null;
};
type ClientSnapshot = {
  kind: string; name: string | null; email: string | null; siren: string | null; vatNumber: string | null;
  billingAddress: Address; deliveryAddress: Address | null;
};
type PaymentTermsSnapshot = {
  dueDate: string; latePaymentPenaltyText: string; earlyPaymentDiscountText: string; latePaymentRecoveryFeeCents: number;
};
type LineForPdf = {
  description: string; unit: string | null; quantityMilli: number; unitPriceCents: number;
  vatRateBp: number; netHtCents: number; vatExemptionCode: string | null; vatLegalNotice: string | null;
};

export type InvoicePdfInput = {
  number: string;
  issuedAt: Date;
  supplyDate: Date;
  dueDate: Date;
  operationCategory: string;
  purchaseOrderNumber: string | null;
  issuer: IssuerSnapshot;
  client: ClientSnapshot;
  paymentTerms: PaymentTermsSnapshot;
  lines: LineForPdf[];
  totals: { totalHtCents: number; totalVatCents: number; totalTtcCents: number };
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 12 },
  block: { marginBottom: 10 },
  row: { flexDirection: 'row', borderBottom: '1pt solid #ccc', paddingVertical: 4 },
  cellLabel: { flex: 3 },
  cellNum: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  bold: { fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 8, color: '#555' },
  terms: { marginTop: 16, fontSize: 8, color: '#555' },
});

function formatAddress(a: Address): string {
  return [a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
}

function InvoiceDocument({ snapshot }: { snapshot: InvoicePdfInput }) {
  const { issuer, client, lines, totals, paymentTerms } = snapshot;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Facture {snapshot.number}</Text>

        <View style={styles.block}>
          <Text style={styles.bold}>{issuer.tradeName || issuer.legalName}</Text>
          {issuer.legalForm && <Text>{issuer.legalForm}</Text>}
          <Text>{formatAddress(issuer.address)}</Text>
          {issuer.siret && <Text>SIRET {issuer.siret}</Text>}
          {!issuer.siret && issuer.siren && <Text>SIREN {issuer.siren}</Text>}
          {issuer.vatNumber && <Text>TVA intracommunautaire {issuer.vatNumber}</Text>}
          {issuer.vatRegime === 'franchise_en_base' && <Text>TVA non applicable, art. 293 B du CGI</Text>}
        </View>

        <View style={styles.block}>
          <Text style={styles.bold}>Client : {client.name}</Text>
          <Text>{formatAddress(client.billingAddress)}</Text>
          {client.deliveryAddress && <Text>Livraison : {formatAddress(client.deliveryAddress)}</Text>}
          {client.siren && <Text>SIREN {client.siren}</Text>}
          {client.vatNumber && <Text>TVA intracommunautaire {client.vatNumber}</Text>}
        </View>

        <View style={styles.block}>
          <Text>Émise le {snapshot.issuedAt.toLocaleDateString('fr-FR')}</Text>
          <Text>Date de vente/prestation : {snapshot.supplyDate.toLocaleDateString('fr-FR')}</Text>
          <Text>Échéance : {snapshot.dueDate.toLocaleDateString('fr-FR')}</Text>
          {snapshot.purchaseOrderNumber && <Text>Bon de commande : {snapshot.purchaseOrderNumber}</Text>}
        </View>

        <View style={styles.row}>
          <Text style={[styles.cellLabel, styles.bold]}>Désignation</Text>
          <Text style={[styles.cellNum, styles.bold]}>Qté</Text>
          <Text style={[styles.cellNum, styles.bold]}>PU HT</Text>
          <Text style={[styles.cellNum, styles.bold]}>TVA</Text>
          <Text style={[styles.cellNum, styles.bold]}>Total HT</Text>
        </View>

        {lines.map((line, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <View style={styles.cellLabel}>
              <Text>{line.description}</Text>
              {line.vatLegalNotice && <Text style={styles.small}>{line.vatLegalNotice}</Text>}
            </View>
            <Text style={styles.cellNum}>
              {(line.quantityMilli / 1000).toLocaleString('fr-FR')}
              {line.unit ? ` ${line.unit}` : ''}
            </Text>
            <Text style={styles.cellNum}>{formatCents(line.unitPriceCents)}</Text>
            <Text style={styles.cellNum}>{(line.vatRateBp / 100).toLocaleString('fr-FR')} %</Text>
            <Text style={styles.cellNum}>{formatCents(line.netHtCents)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Text>Total HT : {formatCents(totals.totalHtCents)}</Text>
          <Text>TVA : {formatCents(totals.totalVatCents)}</Text>
          <Text style={styles.bold}>Total TTC : {formatCents(totals.totalTtcCents)}</Text>
        </View>

        <View style={styles.terms}>
          <Text>{paymentTerms.latePaymentPenaltyText}</Text>
          <Text>{paymentTerms.earlyPaymentDiscountText}</Text>
          <Text>Indemnité forfaitaire de recouvrement en cas de retard : {formatCents(paymentTerms.latePaymentRecoveryFeeCents)}</Text>
        </View>

        <Text
          style={{ marginTop: 16, fontSize: 8 }}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/** Rend le PDF en mémoire à partir des lignes/snapshots déjà figés en base. */
export async function renderInvoicePdf(invoice: {
  number: string | null;
  issuedAt: Date | null;
  supplyDate: Date;
  dueDate: Date;
  operationCategory: string;
  purchaseOrderNumber: string | null;
  issuerSnapshot: unknown;
  clientSnapshot: unknown;
  paymentTermsSnapshot: unknown;
  lines: LineForPdf[];
  totalHtCents: number;
  totalVatCents: number;
  totalTtcCents: number;
}): Promise<Buffer> {
  if (!invoice.number || !invoice.issuedAt) throw new Error('Seule une facture émise peut être rendue en PDF.');
  const input: InvoicePdfInput = {
    number: invoice.number,
    issuedAt: invoice.issuedAt,
    supplyDate: invoice.supplyDate,
    dueDate: invoice.dueDate,
    operationCategory: invoice.operationCategory,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    issuer: invoice.issuerSnapshot as IssuerSnapshot,
    client: invoice.clientSnapshot as ClientSnapshot,
    paymentTerms: invoice.paymentTermsSnapshot as PaymentTermsSnapshot,
    lines: invoice.lines,
    totals: { totalHtCents: invoice.totalHtCents, totalVatCents: invoice.totalVatCents, totalTtcCents: invoice.totalTtcCents },
  };
  const element = <InvoiceDocument snapshot={input} /> as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
