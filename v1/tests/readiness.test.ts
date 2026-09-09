import { describe, it, expect } from 'vitest';
import { checkInvoiceIssuerReadiness, checkClientBillingReadiness } from '@/modules/invoices/readiness';
import type { Organization, Client } from '../generated/prisma/index';

/**
 * Gardien d'émission (docs/v1/lot-4-factures-paiements.md §5) — fonctions
 * pures, testables sans DB.
 */

function org(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'o1', name: 'Test', logoPath: null, clientFollowUpDays: 30, quoteFollowUpDays: 7, quoteHighValueCents: 500_000,
    legalName: 'Test SARL', tradeName: null, legalForm: null, siren: '552100554', siret: null, vatNumber: null,
    addressLine1: '1 rue', addressLine2: null, addressPostalCode: '75001', addressCity: 'Paris', addressCountry: 'FR',
    professionalEmail: null, professionalPhone: null, vatRegime: 'normal', vatOnDebits: false,
    defaultPaymentTermDays: 30, latePaymentPenaltyText: 'x', earlyPaymentDiscountText: 'x', latePaymentRecoveryFeeCents: 4000,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Organization;
}

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1', organizationId: 'o1', kind: 'individual', name: 'Jean Dupont', companyName: null, email: null, phone: null,
    status: 'active', notes: null, lastContactAt: null, archivedAt: null,
    billingLegalName: null, billingAddressLine1: '2 rue', billingAddressLine2: null, billingAddressPostalCode: '75002',
    billingAddressCity: 'Paris', billingAddressCountry: 'FR', billingEmail: null, siren: null, vatNumber: null,
    deliveryAddressLine1: null, deliveryAddressLine2: null, deliveryAddressPostalCode: null, deliveryAddressCity: null, deliveryAddressCountry: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Client;
}

describe('checkInvoiceIssuerReadiness', () => {
  it('aucune information manquante -> liste vide', () => {
    expect(checkInvoiceIssuerReadiness(org())).toEqual([]);
  });

  it('signale la raison sociale manquante', () => {
    expect(checkInvoiceIssuerReadiness(org({ legalName: null }))).toContain('raison sociale de l\'organisation');
  });

  it('signale l’adresse manquante (ligne, code postal, ville)', () => {
    const missing = checkInvoiceIssuerReadiness(org({ addressLine1: null, addressPostalCode: null, addressCity: null }));
    expect(missing.length).toBeGreaterThanOrEqual(3);
  });

  it('exige au moins SIREN ou SIRET', () => {
    expect(checkInvoiceIssuerReadiness(org({ siren: null, siret: null }))).toContain("SIREN ou SIRET de l'organisation");
    expect(checkInvoiceIssuerReadiness(org({ siren: null, siret: '55210055400028' }))).toEqual([]);
  });

  it('rejette un numéro de TVA au format structurellement invalide', () => {
    expect(checkInvoiceIssuerReadiness(org({ vatNumber: 'pas-un-numero-tva' }))).toHaveLength(1);
  });

  it('accepte un numéro de TVA au format valide', () => {
    expect(checkInvoiceIssuerReadiness(org({ vatNumber: 'FR40552100554' }))).toEqual([]);
  });
});

describe('checkClientBillingReadiness', () => {
  it('un particulier avec nom + adresse de facturation est prêt', () => {
    expect(checkClientBillingReadiness(client())).toEqual([]);
  });

  it('signale l’adresse de facturation manquante', () => {
    const missing = checkClientBillingReadiness(client({ billingAddressLine1: null, billingAddressPostalCode: null, billingAddressCity: null }));
    expect(missing.length).toBeGreaterThanOrEqual(3);
  });

  it('une entreprise sans billingLegalName ni companyName -> raison sociale manquante', () => {
    const missing = checkClientBillingReadiness(client({ kind: 'company', name: 'Contact', companyName: null, billingLegalName: null }));
    expect(missing).toContain('raison sociale du client (facturation)');
  });

  it('une entreprise avec companyName seul est acceptée (fallback)', () => {
    expect(checkClientBillingReadiness(client({ kind: 'company', companyName: 'Ma Société', billingLegalName: null }))).toEqual([]);
  });
});
