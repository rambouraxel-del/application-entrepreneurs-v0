'use client';

import { useActionState } from 'react';
import { updatePaymentTermsAction, type FormState } from '@/modules/organizations/actions';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: FormState = { error: null };

export function PaymentTermsForm({
  defaultPaymentTermDays,
  latePaymentPenaltyText,
  earlyPaymentDiscountText,
  latePaymentRecoveryFeeCents,
}: {
  defaultPaymentTermDays: number;
  latePaymentPenaltyText: string;
  earlyPaymentDiscountText: string;
  latePaymentRecoveryFeeCents: number;
}) {
  const [state, formAction, pending] = useActionState(updatePaymentTermsAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <h3 className="text-sm font-semibold text-slate-700">Conditions de paiement</h3>
      <Field label="Délai de paiement par défaut (jours)" htmlFor="defaultPaymentTermDays">
        <Input id="defaultPaymentTermDays" name="defaultPaymentTermDays" type="number" min={0} max={365} defaultValue={defaultPaymentTermDays} />
      </Field>
      <Field label="Mention pénalités de retard" htmlFor="latePaymentPenaltyText">
        <Textarea id="latePaymentPenaltyText" name="latePaymentPenaltyText" rows={2} maxLength={500} defaultValue={latePaymentPenaltyText} />
      </Field>
      <Field label="Mention escompte" htmlFor="earlyPaymentDiscountText">
        <Textarea id="earlyPaymentDiscountText" name="earlyPaymentDiscountText" rows={2} maxLength={500} defaultValue={earlyPaymentDiscountText} />
      </Field>
      <Field label="Indemnité forfaitaire de recouvrement (€)" htmlFor="latePaymentRecoveryFeeEuros">
        <Input
          id="latePaymentRecoveryFeeEuros"
          name="latePaymentRecoveryFeeEuros"
          inputMode="decimal"
          defaultValue={(latePaymentRecoveryFeeCents / 100).toFixed(2)}
        />
      </Field>
      <p className="-mt-2 text-xs text-slate-500">
        ⚑ À valider juridiquement : valeurs par défaut usuelles, pas un conseil juridique — voir docs/v1/lot-4-factures-paiements.md §18.
      </p>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {!state.error && state !== initialState && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Conditions de paiement enregistrées.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
