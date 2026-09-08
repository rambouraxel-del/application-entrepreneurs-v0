import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getClient } from '@/modules/clients/service';
import { archiveClientAction, restoreClientAction, markContactedTodayAction } from '@/modules/clients/actions';
import { CLIENT_STATUS_LABELS } from '@/modules/clients/validation';
import { CLIENT_STATUS_TONE } from '@/modules/clients/presentation';
import { listTasks } from '@/modules/tasks/service';
import { completeTaskAction, reopenTaskAction } from '@/modules/tasks/actions';
import { listQuotes } from '@/modules/quotes/service';
import { formatCents } from '@/modules/quotes/calc';
import { QUOTE_STATUS_LABELS } from '@/modules/quotes/validation';
import { QUOTE_STATUS_TONE } from '@/modules/quotes/presentation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * Fiche Client : identité, coordonnées, statut, dernier contact, notes,
 * actions principales, tâches et devis liés (Lot 3). PAS de
 * factures/RDV/documents/historique exhaustif — ces sections viendront avec
 * les lots qui les rendent réelles (docs/v1/lot-3-devis.md §Fiche Client).
 */
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const client = await getClient(ctx, id);
  if (!client) notFound(); // y compris si le client appartient à une autre organisation (RLS)

  const tasks = await listTasks(ctx, { includeCompleted: true, clientId: id });
  const quotes = await listQuotes(ctx, { clientId: id });
  const isArchived = client.archivedAt !== null;
  const toggleAction = isArchived ? restoreClientAction : archiveClientAction;
  const toggleLabel = isArchived ? 'Réactiver' : 'Archiver';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/app/clients" className="text-sm text-indigo-600 hover:underline">
          ← Retour aux clients
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
          <div className="flex items-center gap-2">
            {isArchived && <Badge tone="neutral">Archivé</Badge>}
            <Badge tone={CLIENT_STATUS_TONE[client.status]}>{CLIENT_STATUS_LABELS[client.status]}</Badge>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
          <div>
            <dt className="text-slate-500">Dernier contact</dt>
            <dd className="text-slate-900">
              {client.lastContactAt ? client.lastContactAt.toLocaleDateString('fr-FR') : 'Aucun'}
            </dd>
          </div>
        </dl>

        {client.notes && (
          <div className="mt-4">
            <p className="text-sm text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{client.notes}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/app/clients/${client.id}/edit`}>
            <Button variant="secondary">Modifier</Button>
          </Link>
          <form action={markContactedTodayAction.bind(null, client.id)}>
            <Button type="submit" variant="secondary">
              Marquer comme contacté aujourd&apos;hui
            </Button>
          </form>
          <form action={toggleAction.bind(null, client.id)}>
            <Button type="submit" variant={isArchived ? 'secondary' : 'danger'}>
              {toggleLabel}
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Tâches liées</h2>
          <Link href={`/app/tasks/new?clientId=${client.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
            + Tâche
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune tâche liée à ce client.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className={task.completedAt ? 'text-slate-400 line-through' : 'text-slate-900'}>
                  {task.title}
                  {task.dueDate && (
                    <span className="ml-2 text-xs text-slate-400">{task.dueDate.toLocaleDateString('fr-FR')}</span>
                  )}
                </span>
                <form action={(task.completedAt ? reopenTaskAction : completeTaskAction).bind(null, task.id)}>
                  <Button type="submit" variant="ghost" className="text-xs">
                    {task.completedAt ? 'Réouvrir' : 'Terminer'}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Devis</h2>
          <Link href={`/app/quotes/new?clientId=${client.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
            + Devis
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun devis pour ce client.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {quotes.slice(0, 5).map((quote) => (
              <li key={quote.id}>
                <Link href={`/app/quotes/${quote.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-slate-50">
                  <span className="text-slate-900">{quote.number ?? 'Brouillon'}</span>
                  <span className="text-slate-500">{formatCents(quote.totalTtcCents)}</span>
                  <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
