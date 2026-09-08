import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getOrganization } from '@/modules/organizations/service';
import { SettingsForm } from './SettingsForm';

/**
 * Réglages minimaux (Lot 2) : nom de l'organisation + seuil de relance. Pas
 * de page Settings étendue (docs/v1/lot-2-clients-dashboard.md §13).
 */
export default async function SettingsPage() {
  const ctx = await requireTenantContext();
  const organization = await getOrganization(ctx);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Réglages</h1>
      <div className="mt-4">
        <SettingsForm name={organization.name} clientFollowUpDays={organization.clientFollowUpDays} />
      </div>
    </div>
  );
}
