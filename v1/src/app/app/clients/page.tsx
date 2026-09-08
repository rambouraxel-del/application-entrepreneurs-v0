import Link from 'next/link';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listClients } from '@/modules/clients/service';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from '@/modules/clients/validation';
import { CLIENT_STATUS_TONE } from '@/modules/clients/presentation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClientStatus } from '../../../../generated/prisma/index';

/**
 * Page Clients (Lot 2) : liste, recherche, filtre par statut, création. Pas
 * de pagination — volume MVP trop faible pour que ça apporte quoi que ce
 * soit (docs/v1/lot-2-clients-dashboard.md §Page Clients). Mobile : cartes
 * empilées, jamais un tableau.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireTenantContext();
  const status = isClientStatus(params.status) ? params.status : undefined;
  const clients = await listClients(ctx, { search: params.q || undefined, status });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Clients</h1>
        <Link href="/app/clients/new">
          <Button>Ajouter un client</Button>
        </Link>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">
          Rechercher un client
        </label>
        <Input id="q" name="q" type="search" placeholder="Rechercher (nom, entreprise, e-mail)…" defaultValue={params.q} />
        <label htmlFor="status" className="sr-only">
          Filtrer par statut
        </label>
        <Select id="status" name="status" defaultValue={params.status ?? ''} className="sm:w-56">
          <option value="">Tous les statuts</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          title={params.q || params.status ? 'Aucun client ne correspond à ces critères' : 'Aucun client pour le moment'}
          description={!params.q && !params.status ? 'Créez votre premier client pour commencer.' : undefined}
          action={
            !params.q && !params.status ? (
              <Link href="/app/clients/new" className="text-sm font-medium text-indigo-600 hover:underline">
                Ajouter un client
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <li key={client.id}>
              <Link href={`/app/clients/${client.id}`}>
                <Card className="h-full transition-colors hover:border-indigo-300">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{client.name}</p>
                      {client.companyName && <p className="text-sm text-slate-500">{client.companyName}</p>}
                    </div>
                    <Badge tone={CLIENT_STATUS_TONE[client.status]}>{CLIENT_STATUS_LABELS[client.status]}</Badge>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-500">
                    {client.email && <div>{client.email}</div>}
                    {client.phone && <div>{client.phone}</div>}
                    {client.lastContactAt && (
                      <div>Dernier contact : {client.lastContactAt.toLocaleDateString('fr-FR')}</div>
                    )}
                  </dl>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isClientStatus(value: string | undefined): value is ClientStatus {
  return !!value && (CLIENT_STATUSES as readonly string[]).includes(value);
}
