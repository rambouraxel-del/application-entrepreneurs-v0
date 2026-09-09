'use client';

import { useActionState, useId } from 'react';
import type { FormState } from './actions';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from './validation';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type PaymentFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  remainingEuros: string;
};

const initialState: FormState = { error: null };

/** Enregistrement d'un paiement (§39) — UX volontairement courte, restant dû préempli. */
export function PaymentForm({ action, remainingEuros }: PaymentFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  // Une clé stable par montage de formulaire : un double-clic soumet deux
  // fois la MÊME clé, ce qui rend l'enregistrement idempotent côté serveur
  // (§32) sans action de l'utilisateur.
  const idempotencyKey = useId();

  return (
    <form action={formAction} className="max-w-sm space-y-3" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey.replace(/[^a-zA-Z0-9]/g, '')} />
      <Field label="Montant (€) *" htmlFor="amount">
        <Input id="amount" name="amount" required inputMode="decimal" defaultValue={remainingEuros} />
      </Field>
      <Field label="Date *" htmlFor="paidAt">
        <Input id="paidAt" name="paidAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Moyen de paiement" htmlFor="method">
        <Select id="method" name="method" defaultValue="bank_transfer">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Référence (optionnel)" htmlFor="reference">
        <Input id="reference" name="reference" maxLength={100} />
      </Field>
      <Field label="Note (optionnel)" htmlFor="note">
        <Input id="note" name="note" maxLength={500} />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer le paiement'}
      </Button>
    </form>
  );
}
