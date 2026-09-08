import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getOrganization } from '@/modules/organizations/service';
import { SettingsForm } from './SettingsForm';

/**
 * Réglages minimaux : nom de l'organisation + seuils de relance (client,
 * devis). Pas de page Settings étendue (docs/v1/lot-3-devis.md §29).
 */
export default async function SettingsPage() {
  const ctx = await requireTenantContext();
  const organization = await getOrganization(ctx);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Réglages</h1>
      <div className="mt-4">
        <SettingsForm
          name={organization.name}
          clientFollowUpDays={organization.clientFollowUpDays}
          quoteFollowUpDays={organization.quoteFollowUpDays}
          quoteHighValueCents={organization.quoteHighValueCents}
        />
      </div>
    </div>
  );
}
