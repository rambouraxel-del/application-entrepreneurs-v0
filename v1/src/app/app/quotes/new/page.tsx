import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listClients } from '@/modules/clients/service';
import { createQuoteAction } from '@/modules/quotes/actions';
import { QuoteMetaForm } from '@/modules/quotes/QuoteMetaForm';

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const ctx = await requireTenantContext();
  const clients = await listClients(ctx);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Nouveau devis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choisissez le client, puis ajoutez les lignes sur la page suivante.
      </p>
      <div className="mt-4">
        <QuoteMetaForm
          action={createQuoteAction}
          submitLabel="Créer le brouillon"
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          defaultValues={clientId ? { clientId } : undefined}
        />
      </div>
    </div>
  );
}
