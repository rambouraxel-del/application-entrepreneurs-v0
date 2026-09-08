import Link from 'next/link';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import { listClients } from '@/modules/clients/service';

export default async function AppHomePage() {
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  const clients = ctx ? await listClients(ctx) : [];

  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold text-slate-900">Socle Lot 1</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cette page confirme que l’authentification, l’organisation et l’isolation des données
        fonctionnent. Le Dashboard décisionnel (5 niveaux) sera connecté à de vraies données dans
        le Lot 2.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Clients enregistrés</p>
        <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
        <Link href="/app/clients" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
          Voir les clients →
        </Link>
      </div>
    </div>
  );
}
