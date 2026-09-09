'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from './validation';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type BillingDefaults = {
  billingLegalName?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingAddressPostalCode?: string | null;
  billingAddressCity?: string | null;
  billingAddressCountry?: string | null;
  billingEmail?: string | null;
  siren?: string | null;
  vatNumber?: string | null;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
  deliveryAddressPostalCode?: string | null;
  deliveryAddressCity?: string | null;
  deliveryAddressCountry?: string | null;
};

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
  } & BillingDefaults;
};

const initialState: FormState = { error: null };

function toDateInputValue(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function ClientForm({ action, submitLabel, defaultValues }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const d = defaultValues;

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <Field label="Type" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue={d?.kind ?? 'individual'}>
          <option value="individual">Particulier</option>
          <option value="company">Entreprise</option>
        </Select>
      </Field>

      <Field label="Nom *" htmlFor="name">
        <Input id="name" name="name" required maxLength={200} defaultValue={d?.name} />
      </Field>

      <Field label="Entreprise (optionnel)" htmlFor="companyName">
        <Input id="companyName" name="companyName" maxLength={200} defaultValue={d?.companyName ?? ''} />
      </Field>

      <Field label="E-mail (optionnel)" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={d?.email ?? ''} />
      </Field>

      <Field label="Téléphone (optionnel)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={d?.phone ?? ''} />
      </Field>

      <Field label="Statut" htmlFor="status">
        <Select id="status" name="status" defaultValue={d?.status ?? 'prospect'}>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dernier contact (optionnel)" htmlFor="lastContactAt">
        <Input id="lastContactAt" name="lastContactAt" type="date" defaultValue={toDateInputValue(d?.lastContactAt)} />
      </Field>

      <Field label="Notes (optionnel)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={d?.notes ?? ''} />
      </Field>

      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Facturation (optionnel — requis pour émettre une facture à ce client)
        </summary>
        <div className="mt-3 space-y-3">
          <Field label="Raison sociale (facturation)" htmlFor="billingLegalName">
            <Input id="billingLegalName" name="billingLegalName" maxLength={200} defaultValue={d?.billingLegalName ?? ''} />
          </Field>
          <Field label="Adresse" htmlFor="billingAddressLine1">
            <Input id="billingAddressLine1" name="billingAddressLine1" maxLength={200} defaultValue={d?.billingAddressLine1 ?? ''} />
          </Field>
          <Field label="Complément d'adresse" htmlFor="billingAddressLine2">
            <Input id="billingAddressLine2" name="billingAddressLine2" maxLength={200} defaultValue={d?.billingAddressLine2 ?? ''} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code postal" htmlFor="billingAddressPostalCode">
              <Input id="billingAddressPostalCode" name="billingAddressPostalCode" maxLength={20} defaultValue={d?.billingAddressPostalCode ?? ''} />
            </Field>
            <Field label="Ville" htmlFor="billingAddressCity">
              <Input id="billingAddressCity" name="billingAddressCity" maxLength={120} defaultValue={d?.billingAddressCity ?? ''} />
            </Field>
          </div>
          <Field label="Pays (code, ex. FR)" htmlFor="billingAddressCountry">
            <Input id="billingAddressCountry" name="billingAddressCountry" maxLength={2} defaultValue={d?.billingAddressCountry ?? 'FR'} />
          </Field>
          <Field label="E-mail de facturation" htmlFor="billingEmail">
            <Input id="billingEmail" name="billingEmail" type="email" defaultValue={d?.billingEmail ?? ''} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SIREN" htmlFor="siren">
              <Input id="siren" name="siren" maxLength={9} placeholder="9 chiffres" defaultValue={d?.siren ?? ''} />
            </Field>
            <Field label="N° TVA intracommunautaire" htmlFor="vatNumber">
              <Input id="vatNumber" name="vatNumber" maxLength={20} defaultValue={d?.vatNumber ?? ''} />
            </Field>
          </div>

          <p className="pt-2 text-xs font-medium text-slate-500">
            Adresse de livraison — uniquement si différente de l&apos;adresse de facturation
          </p>
          <Field label="Adresse de livraison" htmlFor="deliveryAddressLine1">
            <Input id="deliveryAddressLine1" name="deliveryAddressLine1" maxLength={200} defaultValue={d?.deliveryAddressLine1 ?? ''} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code postal" htmlFor="deliveryAddressPostalCode">
              <Input id="deliveryAddressPostalCode" name="deliveryAddressPostalCode" maxLength={20} defaultValue={d?.deliveryAddressPostalCode ?? ''} />
            </Field>
            <Field label="Ville" htmlFor="deliveryAddressCity">
              <Input id="deliveryAddressCity" name="deliveryAddressCity" maxLength={120} defaultValue={d?.deliveryAddressCity ?? ''} />
            </Field>
          </div>
        </div>
      </details>

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
