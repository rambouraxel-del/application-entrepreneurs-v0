'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from './validation';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type ClientFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaultValues?: {
    kind?: string;
    name?: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string;
    notes?: string | null;
    lastContactAt?: Date | null;
  };
};

const initialState: FormState = { error: null };

function toDateInputValue(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function ClientForm({ action, submitLabel, defaultValues }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Type" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue={defaultValues?.kind ?? 'individual'}>
          <option value="individual">Particulier</option>
          <option value="company">Entreprise</option>
        </Select>
      </Field>

      <Field label="Nom *" htmlFor="name">
        <Input id="name" name="name" required maxLength={200} defaultValue={defaultValues?.name} />
      </Field>

      <Field label="Entreprise (optionnel)" htmlFor="companyName">
        <Input id="companyName" name="companyName" maxLength={200} defaultValue={defaultValues?.companyName ?? ''} />
      </Field>

      <Field label="E-mail (optionnel)" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ''} />
      </Field>

      <Field label="Téléphone (optionnel)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={defaultValues?.phone ?? ''} />
      </Field>

      <Field label="Statut" htmlFor="status">
        <Select id="status" name="status" defaultValue={defaultValues?.status ?? 'prospect'}>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dernier contact (optionnel)" htmlFor="lastContactAt">
        <Input
          id="lastContactAt"
          name="lastContactAt"
          type="date"
          defaultValue={toDateInputValue(defaultValues?.lastContactAt)}
        />
      </Field>

      <Field label="Notes (optionnel)" htmlFor="notes">
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
