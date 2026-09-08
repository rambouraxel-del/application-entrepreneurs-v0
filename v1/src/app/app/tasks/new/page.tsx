import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listClients } from '@/modules/clients/service';
import { createTaskAction } from '@/modules/tasks/actions';
import { TaskForm } from '@/modules/tasks/TaskForm';

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const ctx = await requireTenantContext();
  const clients = await listClients(ctx);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Nouvelle tâche</h1>
      <div className="mt-4">
        <TaskForm
          action={createTaskAction}
          submitLabel="Créer la tâche"
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          defaultValues={clientId ? { clientId } : undefined}
        />
      </div>
    </div>
  );
}
