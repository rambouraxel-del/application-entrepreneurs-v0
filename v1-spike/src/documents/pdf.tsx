import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { formatCents } from '../money/money.js';

/**
 * Gabarit PDF minimal du spike.
 *
 * On ne teste pas l'esthétique mais la FIABILITÉ de la chaîne :
 * caractères français accentués, symbole €, montants, structure, pagination.
 *
 * @react-pdf/renderer produit le PDF en JavaScript pur : aucun Chromium, donc
 * pas de binaire lourd à embarquer ni de démarrage à froid pénalisant en
 * environnement serverless.
 */

export type DocumentSnapshot = {
  number: string;
  issuedAt: string;
  seller: { legalName: string; address: string; siret: string };
  client: { name: string; address: string };
  lines: Array<{ label: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; netHtCents: number; vatCents: number }>;
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

function InvoiceDocument({ snapshot }: { snapshot: DocumentSnapshot }) {
  const { seller, client, lines, totals } = snapshot;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Facture {snapshot.number}</Text>

        <View style={styles.block}>
          <Text style={styles.bold}>{seller.legalName}</Text>
          <Text>{seller.address}</Text>
          <Text>SIRET {seller.siret}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.bold}>Client : {client.name}</Text>
          <Text>{client.address}</Text>
          <Text>Émise le {snapshot.issuedAt}</Text>
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
            <Text style={styles.cellLabel}>{line.label}</Text>
            <Text style={styles.cellNum}>{(line.quantityMilli / 1000).toLocaleString('fr-FR')}</Text>
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

/** Rend le PDF en mémoire. Retourne le buffer : le stockage est un autre module. */
export async function renderInvoicePdf(snapshot: DocumentSnapshot): Promise<Buffer> {
  // Le cast contourne une limite de typage connue de @react-pdf/renderer :
  // renderToBuffer attend un élément <Document> littéral et ne reconnaît pas
  // un composant qui en retourne un. Sans incidence à l'exécution.
  const element = <InvoiceDocument snapshot={snapshot} /> as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
