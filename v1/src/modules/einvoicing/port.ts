/**
 * Port de facturation électronique — ARCHITECTURE, pas intégration
 * (docs/v1/lot-4-factures-paiements.md §44-47). Cockpit ne devient pas une
 * Plateforme Agréée (PA) ; ce module prépare seulement le point d'extension
 * futur : `Invoice domain -> EInvoicePort -> futur adaptateur PA/fournisseur`.
 *
 * Aucun appel réseau, aucun format de transmission (Factur-X/UBL/CII) ici —
 * uniquement une projection provider-neutral des données déjà structurées
 * dans le modèle métier (`Invoice`, snapshots). `NullEInvoiceAdapter` est le
 * seul adaptateur fourni : il ne fait rien, volontairement — le choix d'un
 * fournisseur/PA réel est une décision hors périmètre de ce lot.
 */

export type EInvoiceAddress = {
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

/**
 * Projection neutre des données nécessaires à un futur envoi via une PA —
 * volontairement plate et sans format de transmission encodé dedans (§45).
 */
export type EInvoicePayload = {
  invoiceId: string;
  number: string;
  issuedAt: string; // ISO 8601 — pas de type Date : payload sérialisable tel quel.
  supplyDate: string;
  dueDate: string;
  operationCategory: 'goods' | 'services' | 'mixed';
  purchaseOrderNumber: string | null;
  seller: { siren: string | null; siret: string | null; vatNumber: string | null; legalName: string | null; address: EInvoiceAddress };
  buyer: { siren: string | null; vatNumber: string | null; name: string | null; billingAddress: EInvoiceAddress; deliveryAddress: EInvoiceAddress | null };
  lines: Array<{
    description: string;
    quantityMilli: number;
    unitPriceCents: number;
    vatRateBp: number;
    vatExemptionCode: string | null;
    netHtCents: number;
    vatCents: number;
  }>;
  totals: { totalHtCents: number; totalVatCents: number; totalTtcCents: number };
};

/** Le futur adaptateur PA/fournisseur implémentera ceci. Rien de plus n'est nécessaire aujourd'hui (§44). */
export interface EInvoicePort {
  /** Transmet une facture émise. Renvoie un identifiant de suivi propre au fournisseur. */
  submit(payload: EInvoicePayload): Promise<{ providerReference: string }>;
}

/**
 * Adaptateur no-op — permet au domaine de dépendre du port dès maintenant
 * sans qu'aucun choix de fournisseur ne soit engagé. Ne jamais utiliser pour
 * prétendre qu'une transmission a eu lieu.
 */
export class NullEInvoiceAdapter implements EInvoicePort {
  async submit(): Promise<{ providerReference: string }> {
    throw new Error(
      "Aucun fournisseur de facturation électronique n'est configuré (architecture préparée, intégration hors périmètre du Lot 4).",
    );
  }
}
