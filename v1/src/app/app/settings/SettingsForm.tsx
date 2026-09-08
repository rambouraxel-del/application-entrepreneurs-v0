'use client';

import { useActionState } from 'react';
import { updateSettingsAction, type FormState } from '@/modules/organizations/actions';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: FormState = { error: null };

export function SettingsForm({ name, clientFollowUpDays }: { name: string; clientFollowUpDays: number }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Nom de l'organisation" htmlFor="name">
        <Input id="name" name="name" required maxLength={200} defaultValue={name} />
      </Field>

      <Field label="Seuil de relance (jours)" htmlFor="clientFollowUpDays">
        <Input
          id="clientFollowUpDays"
          name="clientFollowUpDays"
          type="number"
          min={1}
          max={365}
          defaultValue={clientFollowUpDays}
        />
      </Field>
      <p className="-mt-2 text-xs text-slate-500">
        Un client actif, prospect ou fidèle sans contact depuis plus de ce nombre de jours apparaît comme opportunité
        au Dashboard.
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
