import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getOrganization } from '@/modules/organizations/service';
import { checkInvoiceIssuerReadiness } from '@/modules/invoices/readiness';
import { SettingsForm } from './SettingsForm';
import { LegalIdentityForm } from './LegalIdentityForm';
import { PaymentTermsForm } from './PaymentTermsForm';

/**
 * Réglages : nom + seuils de relance, identité légale, adresse, TVA,
 * conditions de paiement (Lot 4 §4) — sections simples, pas de refonte.
 */
export default async function SettingsPage() {
  const ctx = await requireTenantContext();
  const organization = await getOrganization(ctx);
  const missing = checkInvoiceIssuerReadiness(organization);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Réglages</h1>
        {missing.length > 0 && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Informations manquantes pour émettre une facture : {missing.join(', ')}.
          </p>
        )}
      </div>

      <SettingsForm
        name={organization.name}
        clientFollowUpDays={organization.clientFollowUpDays}
        quoteFollowUpDays={organization.quoteFollowUpDays}
        quoteHighValueCents={organization.quoteHighValueCents}
      />

      <LegalIdentityForm
        defaults={{
          legalName: organization.legalName,
          tradeName: organization.tradeName,
          legalForm: organization.legalForm,
          siren: organization.siren,
          siret: organization.siret,
          vatNumber: organization.vatNumber,
          addressLine1: organization.addressLine1,
          addressLine2: organization.addressLine2,
          addressPostalCode: organization.addressPostalCode,
          addressCity: organization.addressCity,
          addressCountry: organization.addressCountry,
          professionalEmail: organization.professionalEmail,
          professionalPhone: organization.professionalPhone,
          vatRegime: organization.vatRegime,
          vatOnDebits: organization.vatOnDebits,
        }}
      />

      <PaymentTermsForm
        defaultPaymentTermDays={organization.defaultPaymentTermDays}
        latePaymentPenaltyText={organization.latePaymentPenaltyText}
        earlyPaymentDiscountText={organization.earlyPaymentDiscountText}
        latePaymentRecoveryFeeCents={organization.latePaymentRecoveryFeeCents}
      />
    </div>
  );
}
