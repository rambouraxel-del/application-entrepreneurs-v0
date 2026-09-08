import Link from 'next/link';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listTasks } from '@/modules/tasks/service';
import { completeTaskAction, reopenTaskAction, deleteTaskAction } from '@/modules/tasks/actions';
import { TASK_PRIORITY_LABELS } from '@/modules/tasks/validation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const PRIORITY_TONE = { high: 'danger', normal: 'info', low: 'neutral' } as const;

/**
 * Page Tâches (Lot 2) — utile pour voir/gérer les tâches indépendamment du
 * Dashboard, notamment celles sans client lié. Pas de sous-tâches, pas de
 * projets, pas de récurrence (docs/v1/lot-2-clients-dashboard.md §Tasks).
 */
export default async function TasksPage() {
  const ctx = await requireTenantContext();
  const tasks = await listTasks(ctx, { includeCompleted: true });
  const pending = tasks.filter((t) => !t.completedAt);
  const completed = tasks.filter((t) => t.completedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Tâches</h1>
        <Link href="/app/tasks/new">
          <Button>Nouvelle tâche</Button>
        </Link>
      </div>

      {pending.length === 0 ? (
        <EmptyState title="Aucune tâche en cours" description="Créez une tâche pour la voir apparaître ici et au Dashboard." />
      ) : (
        <ul className="space-y-2">
          {pending.map((task) => (
            <li key={task.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <Badge tone={PRIORITY_TONE[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.client && (
                      <Link href={`/app/clients/${task.client.id}`} className="text-indigo-600 hover:underline">
                        {task.client.name}
                      </Link>
                    )}
                    {task.client && task.dueDate && ' · '}
                    {task.dueDate && `Échéance : ${task.dueDate.toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={completeTaskAction.bind(null, task.id)}>
                    <Button type="submit" variant="secondary">
                      Terminer
                    </Button>
                  </form>
                  <form action={deleteTaskAction.bind(null, task.id)}>
                    <Button type="submit" variant="danger">
                      Supprimer
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Tâches terminées ({completed.length})
          </summary>
          <ul className="divide-y divide-slate-200 border-t border-slate-200">
            {completed.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="text-slate-400 line-through">{task.title}</span>
                <form action={reopenTaskAction.bind(null, task.id)}>
                  <Button type="submit" variant="ghost" className="text-xs">
                    Réouvrir
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
