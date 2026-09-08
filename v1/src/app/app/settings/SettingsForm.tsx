'use client';

import { useActionState } from 'react';
import { updateSettingsAction, type FormState } from '@/modules/organizations/actions';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: FormState = { error: null };

export function SettingsForm({
  name,
  clientFollowUpDays,
  quoteFollowUpDays,
  quoteHighValueCents,
}: {
  name: string;
  clientFollowUpDays: number;
  quoteFollowUpDays: number;
  quoteHighValueCents: number;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Nom de l'organisation" htmlFor="name">
        <Input id="name" name="name" required maxLength={200} defaultValue={name} />
      </Field>

      <Field label="Seuil de relance client (jours)" htmlFor="clientFollowUpDays">
        <Input id="clientFollowUpDays" name="clientFollowUpDays" type="number" min={1} max={365} defaultValue={clientFollowUpDays} />
      </Field>
      <p className="-mt-2 text-xs text-slate-500">
        Un client actif, prospect ou fidèle sans contact depuis plus longtemps apparaît comme opportunité au Dashboard.
      </p>

      <Field label="Seuil de relance devis (jours)" htmlFor="quoteFollowUpDays">
        <Input id="quoteFollowUpDays" name="quoteFollowUpDays" type="number" min={1} max={365} defaultValue={quoteFollowUpDays} />
      </Field>
      <p className="-mt-2 text-xs text-slate-500">
        Un devis envoyé sans réponse depuis plus longtemps apparaît en alerte au Dashboard.
      </p>

      <Field label="Seuil devis « forte valeur » (€ TTC)" htmlFor="quoteHighValueEuros">
        <Input
          id="quoteHighValueEuros"
          name="quoteHighValueEuros"
          inputMode="decimal"
          defaultValue={(quoteHighValueCents / 100).toFixed(2)}
        />
      </Field>
      <p className="-mt-2 text-xs text-slate-500">
        Un devis ouvert au-delà de ce montant apparaît comme opportunité au Dashboard.
      </p>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {!state.error && state !== initialState && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Réglages enregistrés.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
