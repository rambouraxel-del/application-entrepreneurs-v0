'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { VAT_RATES_BP, VAT_RATE_LABELS } from './validation';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export type QuoteLineFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaultValues?: {
    description?: string;
    unit?: string | null;
    quantity?: string;
    unitPrice?: string;
    vatRateBp?: number;
    discountPercent?: string;
  };
  compact?: boolean;
};

const initialState: FormState = { error: null };

/** Formulaire d'une ligne de devis — utilisé pour l'ajout et l'édition (mêmes champs). */
export function QuoteLineForm({ action, submitLabel, defaultValues, compact }: QuoteLineFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const idPrefix = compact ? 'edit-' : 'new-';

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Field label="Description *" htmlFor={`${idPrefix}description`}>
            <Input id={`${idPrefix}description`} name="description" required maxLength={500} defaultValue={defaultValues?.description} />
          </Field>
        </div>
        <div>
          <Field label="Unité" htmlFor={`${idPrefix}unit`}>
            <Input id={`${idPrefix}unit`} name="unit" maxLength={20} placeholder="h, jour…" defaultValue={defaultValues?.unit ?? ''} />
          </Field>
        </div>
        <div>
          <Field label="Quantité *" htmlFor={`${idPrefix}quantity`}>
            <Input id={`${idPrefix}quantity`} name="quantity" required inputMode="decimal" placeholder="1" defaultValue={defaultValues?.quantity ?? '1'} />
          </Field>
        </div>
        <div>
          <Field label="Prix unitaire HT *" htmlFor={`${idPrefix}unitPrice`}>
            <Input id={`${idPrefix}unitPrice`} name="unitPrice" required inputMode="decimal" placeholder="0,00" defaultValue={defaultValues?.unitPrice} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div>
          <Field label="TVA" htmlFor={`${idPrefix}vatRateBp`}>
            <Select id={`${idPrefix}vatRateBp`} name="vatRateBp" defaultValue={defaultValues?.vatRateBp ?? 2000}>
              {VAT_RATES_BP.map((bp) => (
                <option key={bp} value={bp}>
                  {VAT_RATE_LABELS[bp]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <Field label="Remise % (optionnel)" htmlFor={`${idPrefix}discountPercent`}>
            <Input id={`${idPrefix}discountPercent`} name="discountPercent" inputMode="decimal" placeholder="0" defaultValue={defaultValues?.discountPercent ?? ''} />
          </Field>
        </div>
        <div className="flex items-end sm:col-span-4 sm:justify-end">
          <Button type="submit" disabled={pending} variant={compact ? 'secondary' : 'primary'}>
            {pending ? 'Enregistrement…' : submitLabel}
          </Button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
