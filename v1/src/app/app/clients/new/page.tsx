import { ClientForm } from '@/modules/clients/ClientForm';
import { createClientAction } from '@/modules/clients/actions';

export default function NewClientPage() {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">Nouveau client</h2>
      <div className="mt-4">
        <ClientForm action={createClientAction} submitLabel="Créer le client" />
      </div>
    </div>
  );
}
