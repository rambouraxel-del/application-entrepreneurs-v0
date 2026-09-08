import { notFound } from 'next/navigation';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getClient } from '@/modules/clients/service';
import { updateClientAction } from '@/modules/clients/actions';
import { ClientForm } from '@/modules/clients/ClientForm';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const client = await getClient(ctx, id);
  if (!client) notFound();

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">Modifier {client.name}</h2>
      <div className="mt-4">
        <ClientForm action={updateClientAction.bind(null, id)} submitLabel="Enregistrer" defaultValues={client} />
      </div>
    </div>
  );
}
