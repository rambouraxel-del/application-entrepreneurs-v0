'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from './validation';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type TaskFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  clients: { id: string; name: string }[];
  defaultValues?: { title?: string; clientId?: string | null; dueDate?: string; priority?: string };
};

const initialState: FormState = { error: null };

export function TaskForm({ action, submitLabel, clients, defaultValues }: TaskFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Titre *" htmlFor="title">
        <Input id="title" name="title" required maxLength={200} defaultValue={defaultValues?.title} />
      </Field>

      <Field label="Client (optionnel)" htmlFor="clientId">
        <Select id="clientId" name="clientId" defaultValue={defaultValues?.clientId ?? ''}>
          <option value="">Aucun</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Échéance (optionnel)" htmlFor="dueDate">
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultValues?.dueDate} />
      </Field>

      <Field label="Priorité" htmlFor="priority">
        <Select id="priority" name="priority" defaultValue={defaultValues?.priority ?? 'normal'}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {TASK_PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
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
