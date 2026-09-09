import type { Organization, Client } from '../../../generated/prisma/index';

/**
 * Gardien métier explicite (docs/v1/lot-4-factures-paiements.md §5) : une
 * vraie facture ne doit jamais pouvoir être émise si l'identité émetteur ou
 * client minimale nécessaire manque. Appelé côté service AVANT toute
 * transaction d'émission — jamais une simple contrainte NOT NULL en base
 * (qui bloquerait l'organisation avant même sa création) ni une validation
 * seulement côté UI.
 *
 * ⚑ À VALIDER JURIDIQUEMENT : cette liste couvre les mentions usuellement
 * exigées sur une facture française (raison sociale, adresse, SIREN/SIRET,
 * TVA le cas échéant) — ce n'est pas un avis juridique et ne garantit pas
 * la conformité complète (voir docs/v1/lot-4-factures-paiements.md §18).
 */
export class InvoiceReadinessError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Informations manquantes pour émettre une facture : ${missing.join(', ')}`);
    this.name = 'InvoiceReadinessError';
  }
}

export function checkInvoiceIssuerReadiness(organization: Organization): string[] {
  const missing: string[] = [];
  if (!organization.legalName?.trim()) missing.push("raison sociale de l'organisation");
  if (!organization.addressLine1?.trim()) missing.push("adresse de l'organisation");
  if (!organization.addressPostalCode?.trim()) missing.push("code postal de l'organisation");
  if (!organization.addressCity?.trim()) missing.push("ville de l'organisation");
  if (!organization.siren?.trim() && !organization.siret?.trim()) {
    missing.push("SIREN ou SIRET de l'organisation");
  }
  // TVA incohérente : régime normal mais aucun numéro renseigné n'est pas
  // bloquant en soi (beaucoup de très petites structures en franchise
  // partielle...), mais un numéro de TVA structurellement invalide l'est.
  if (organization.vatNumber && !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(organization.vatNumber.replace(/\s/g, ''))) {
    missing.push('numéro de TVA intracommunautaire (format invalide)');
  }
  return missing;
}

export function checkClientBillingReadiness(client: Client): string[] {
  const missing: string[] = [];
  const displayName = client.kind === 'company' ? client.billingLegalName || client.companyName : client.name;
  if (!displayName?.trim()) missing.push('raison sociale du client (facturation)');
  if (!client.billingAddressLine1?.trim()) missing.push('adresse de facturation du client');
  if (!client.billingAddressPostalCode?.trim()) missing.push('code postal de facturation du client');
  if (!client.billingAddressCity?.trim()) missing.push('ville de facturation du client');
  return missing;
}

/** Lève `InvoiceReadinessError` si l'organisation n'est pas prête à émettre une facture. */
export function assertInvoiceIssuerReady(organization: Organization): void {
  const missing = checkInvoiceIssuerReadiness(organization);
  if (missing.length > 0) throw new InvoiceReadinessError(missing);
}

/** Lève `InvoiceReadinessError` si le client n'a pas les données de facturation minimales. */
export function assertClientBillingReady(client: Client): void {
  const missing = checkClientBillingReadiness(client);
  if (missing.length > 0) throw new InvoiceReadinessError(missing);
}
