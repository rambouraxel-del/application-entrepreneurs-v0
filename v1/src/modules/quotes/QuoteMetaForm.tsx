'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type QuoteMetaFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  clients: { id: string; name: string }[];
  defaultValues?: { clientId?: string; validUntil?: string; notes?: string | null };
};

const initialState: FormState = { error: null };

export function QuoteMetaForm({ action, submitLabel, clients, defaultValues }: QuoteMetaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Client *" htmlFor="clientId">
        <Select id="clientId" name="clientId" required defaultValue={defaultValues?.clientId ?? ''}>
          <option value="" disabled>
            Choisir un client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Valable jusqu'au (optionnel)" htmlFor="validUntil">
        <Input id="validUntil" name="validUntil" type="date" defaultValue={defaultValues?.validUntil} />
      </Field>

      <Field label="Notes / conditions (optionnel)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={defaultValues?.notes ?? ''} />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
