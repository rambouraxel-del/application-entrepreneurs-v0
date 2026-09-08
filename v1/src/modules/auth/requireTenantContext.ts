import { redirect } from 'next/navigation';
import { requireSession } from './session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import type { TenantContext } from '@/lib/tenant/context';

/**
 * Séquence imposée à toute Server Action / page privée
 * (docs/v1/architecture.md §5) : authentifier -> résoudre le contexte tenant.
 * Partagé entre les modules clients/tasks/dashboard pour ne pas la dupliquer.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  if (!ctx) redirect('/app/onboarding');
  return ctx;
}
