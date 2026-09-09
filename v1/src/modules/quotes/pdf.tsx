import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { formatCents } from '@/lib/billing/calc';

/**
 * Gabarit PDF du devis — porté du spike Lot 0 (v1-spike/src/documents/pdf.tsx,
 * mesures réelles : docs/v1/lot-0-validation.md §7.1), adapté au devis.
 *
 * Rendu à partir du SNAPSHOT figé à l'émission, jamais depuis l'état courant
 * du Client/Organization : reproductible à l'identique quel que soit le
 * moment de la génération/régénération.
 *
 * ⚑ À VALIDER JURIDIQUEMENT : Organization ne porte pas encore SIRET/adresse
 * légale — non affichés ici faute d'exister (docs/v1/lot-3-devis.md §Point réglementaire).
 */

type ClientSnapshot = { name: string; companyName: string | null; email: string | null; phone: string | null };
type OrganizationSnapshot = { name: string };
type LineForPdf = {
  description: string;
  unit: string | null;
  quantityMilli: number;
  unitPriceCents: number;
  vatRateBp: number;
  netHtCents: number;
};

export type QuotePdfInput = {
  number: string;
  issuedAt: Date;
  validUntil: Date | null;
  client: ClientSnapshot;
  organization: OrganizationSnapshot;
  lines: LineForPdf[];
  totals: { totalHtCents: number; totalVatCents: number; totalTtcCents: number };
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 12 },
  block: { marginBottom: 12 },
  row: { flexDirection: 'row', borderBottom: '1pt solid #ccc', paddingVertical: 4 },
  cellLabel: { flex: 3 },
  cellNum: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  bold: { fontFamily: 'Helvetica-Bold' },
});

function QuoteDocument({ snapshot }: { snapshot: QuotePdfInput }) {
  const { client, organization, lines, totals } = snapshot;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Devis {snapshot.number}</Text>

        <View style={styles.block}>
          <Text style={styles.bold}>{organization.name}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.bold}>Client : {client.companyName || client.name}</Text>
          {client.companyName && <Text>{client.name}</Text>}
          <Text>Émis le {snapshot.issuedAt.toLocaleDateString('fr-FR')}</Text>
          {snapshot.validUntil && <Text>Valable jusqu&apos;au {snapshot.validUntil.toLocaleDateString('fr-FR')}</Text>}
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
            <Text style={styles.cellLabel}>{line.description}</Text>
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

        <Text
          style={{ marginTop: 24, fontSize: 8 }}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/** Rend le PDF en mémoire à partir des lignes/snapshots déjà figés en base. */
export async function renderQuotePdf(quote: {
  number: string | null;
  issuedAt: Date | null;
  validUntil: Date | null;
  clientSnapshot: unknown;
  organizationSnapshot: unknown;
  lines: LineForPdf[];
  totalHtCents: number;
  totalVatCents: number;
  totalTtcCents: number;
}): Promise<Buffer> {
  if (!quote.number || !quote.issuedAt) throw new Error('Seul un devis émis peut être rendu en PDF.');
  const input: QuotePdfInput = {
    number: quote.number,
    issuedAt: quote.issuedAt,
    validUntil: quote.validUntil,
    client: quote.clientSnapshot as ClientSnapshot,
    organization: quote.organizationSnapshot as OrganizationSnapshot,
    lines: quote.lines,
    totals: { totalHtCents: quote.totalHtCents, totalVatCents: quote.totalVatCents, totalTtcCents: quote.totalTtcCents },
  };
  // Le cast contourne une limite de typage connue de @react-pdf/renderer :
  // renderToBuffer attend un élément <Document> littéral (voir v1-spike).
  const element = <QuoteDocument snapshot={input} /> as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
