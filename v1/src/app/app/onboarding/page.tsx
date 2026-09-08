import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext, createOrganizationForNewUser } from '@/modules/organizations/service';

/**
 * Filet de sécurité : un utilisateur authentifié mais sans aucun membership
 * (cas normalement impossible via /signup, qui crée toujours l'organisation
 * dans la même transaction) atterrit ici plutôt que sur une erreur.
 */
export default async function OnboardingPage() {
  const session = await requireSession();
  const existing = await resolveDefaultTenantContext(session);
  if (existing) redirect('/app');

  async function createOrganization(formData: FormData) {
    'use server';
    const s = await requireSession();
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return;
    await createOrganizationForNewUser(s, name);
    redirect('/app');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Créer votre organisation</h1>
        <p className="mt-1 text-sm text-slate-500">Aucune organisation n’est encore associée à votre compte.</p>
        <form action={createOrganization} className="mt-6 space-y-4">
          <input
            name="name"
            required
            maxLength={200}
            placeholder="Nom de votre entreprise"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <button type="submit" className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Créer
          </button>
        </form>
      </div>
    </main>
  );
}
