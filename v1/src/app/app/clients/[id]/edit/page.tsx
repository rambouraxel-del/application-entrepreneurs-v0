import { notFound } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import { getClient } from '@/modules/clients/service';
import { updateClientAction } from '@/modules/clients/actions';
import { ClientForm } from '@/modules/clients/ClientForm';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  const client = ctx ? await getClient(ctx, id) : null;
  if (!client) notFound();

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">Modifier {client.name}</h2>
      <div className="mt-4">
        <ClientForm
          action={updateClientAction.bind(null, id)}
          submitLabel="Enregistrer"
          defaultValues={client}
        />
      </div>
    </div>
  );
}
