import { describe, it, expect } from 'vitest';
import { buildEInvoicePayload } from '@/modules/einvoicing/mapping';
import { NullEInvoiceAdapter } from '@/modules/einvoicing/port';

/**
 * E-invoicing — architecture, pas intégration (docs/v1/lot-4-factures-paiements.md
 * §44-47). Le mapping est une fonction pure : testable sans DB/réseau.
 */

const baseInvoice = {
  id: 'inv-1',
  number: 'FAC-2026-000001',
  issuedAt: new Date('2026-01-15T00:00:00Z'),
  supplyDate: new Date('2026-01-10T00:00:00Z'),
  dueDate: new Date('2026-02-14T00:00:00Z'),
  operationCategory: 'services' as const,
  purchaseOrderNumber: 'PO-42',
  issuerSnapshot: {
    legalName: 'Dupont Menuiserie SARL', siren: '552100554', siret: '55210055400028', vatNumber: 'FR40552100554',
    address: { line1: '12 rue des Artisans', line2: null, postalCode: '69001', city: 'Lyon', country: 'FR' },
  },
  clientSnapshot: {
    name: 'Menuiserie du Parc SAS', siren: '482300123', vatNumber: 'FR12482300123',
    billingAddress: { line1: '4 avenue du Parc', line2: null, postalCode: '69003', city: 'Lyon', country: 'FR' },
    deliveryAddress: null,
  },
  lines: [
    { description: 'Prestation', quantityMilli: 1000, unitPriceCents: 100_000, vatRateBp: 2000, vatExemptionCode: null, netHtCents: 100_000, vatCents: 20_000 },
  ],
  totalHtCents: 100_000,
  totalVatCents: 20_000,
  totalTtcCents: 120_000,
};

describe('buildEInvoicePayload — mapping pur', () => {
  it('projette les identifiants émetteur/client requis (§45)', () => {
    const payload = buildEInvoicePayload(baseInvoice);
    expect(payload.seller.siren).toBe('552100554');
    expect(payload.seller.siret).toBe('55210055400028');
    expect(payload.seller.vatNumber).toBe('FR40552100554');
    expect(payload.buyer.siren).toBe('482300123');
    expect(payload.buyer.vatNumber).toBe('FR12482300123');
  });

  it('projette les adresses', () => {
    const payload = buildEInvoicePayload(baseInvoice);
    expect(payload.seller.address.city).toBe('Lyon');
    expect(payload.buyer.billingAddress.postalCode).toBe('69003');
    expect(payload.buyer.deliveryAddress).toBeNull();
  });

  it('adresse de livraison projetée quand présente', () => {
    const payload = buildEInvoicePayload({
      ...baseInvoice,
      clientSnapshot: {
        ...baseInvoice.clientSnapshot,
        deliveryAddress: { line1: '8 rue Chantier', line2: null, postalCode: '69004', city: 'Lyon', country: 'FR' },
      },
    });
    expect(payload.buyer.deliveryAddress).not.toBeNull();
    expect(payload.buyer.deliveryAddress!.postalCode).toBe('69004');
  });

  it('projette la catégorie d’opération et le bon de commande', () => {
    const payload = buildEInvoicePayload(baseInvoice);
    expect(payload.operationCategory).toBe('services');
    expect(payload.purchaseOrderNumber).toBe('PO-42');
  });

  it('sérialise les dates en ISO 8601 (payload stable, pas de type Date)', () => {
    const payload = buildEInvoicePayload(baseInvoice);
    expect(payload.issuedAt).toBe('2026-01-15T00:00:00.000Z');
    expect(typeof payload.issuedAt).toBe('string');
  });

  it('projette les lignes et les totaux sans les recalculer', () => {
    const payload = buildEInvoicePayload(baseInvoice);
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]!.netHtCents).toBe(100_000);
    expect(payload.totals.totalTtcCents).toBe(120_000);
  });

  it('propage un motif d’exonération de TVA sur une ligne', () => {
    const payload = buildEInvoicePayload({
      ...baseInvoice,
      lines: [{ ...baseInvoice.lines[0]!, vatRateBp: 0, vatExemptionCode: 'FR-293B', netHtCents: 100_000, vatCents: 0 }],
    });
    expect(payload.lines[0]!.vatExemptionCode).toBe('FR-293B');
  });
});

describe('NullEInvoiceAdapter — aucune Plateforme Agréée réelle (§44)', () => {
  it('refuse explicitement toute soumission (aucun fournisseur configuré)', async () => {
    const adapter = new NullEInvoiceAdapter();
    await expect(adapter.submit()).rejects.toThrow(/aucun fournisseur/i);
  });
});
