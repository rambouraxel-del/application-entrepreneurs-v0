import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import { getClient } from '@/modules/clients/service';
import { archiveClientAction, restoreClientAction } from '@/modules/clients/actions';

const statusLabel: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Actif',
  archived: 'Archivé',
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  const client = ctx ? await getClient(ctx, id) : null;
  if (!client) notFound(); // y compris si le client appartient à une autre organisation

  const toggleAction = client.status === 'archived' ? restoreClientAction : archiveClientAction;
  const toggleLabel = client.status === 'archived' ? 'Réactiver' : 'Archiver';

  return (
    <div className="max-w-md">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{client.name}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {statusLabel[client.status]}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {client.companyName && (
          <div>
            <dt className="text-slate-500">Entreprise</dt>
            <dd className="text-slate-900">{client.companyName}</dd>
          </div>
        )}
        {client.email && (
          <div>
            <dt className="text-slate-500">E-mail</dt>
            <dd className="text-slate-900">{client.email}</dd>
          </div>
        )}
        {client.phone && (
          <div>
            <dt className="text-slate-500">Téléphone</dt>
            <dd className="text-slate-900">{client.phone}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/app/clients/${client.id}/edit`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Modifier
        </Link>
        <form
          action={async () => {
            'use server';
            await toggleAction(client.id);
          }}
        >
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {toggleLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
