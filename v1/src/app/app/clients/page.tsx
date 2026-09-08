import Link from 'next/link';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import { listClients } from '@/modules/clients/service';

const statusLabel: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Actif',
  archived: 'Archivé',
};

export default async function ClientsPage() {
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  const clients = ctx ? await listClients(ctx) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Clients</h2>
        <Link
          href="/app/clients/new"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Ajouter un client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aucun client pour l’instant.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/app/clients/${client.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium text-slate-900">{client.name}</span>
                  {client.companyName && <span className="ml-2 text-slate-500">{client.companyName}</span>}
                </span>
                <span className="text-xs text-slate-400">{statusLabel[client.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
