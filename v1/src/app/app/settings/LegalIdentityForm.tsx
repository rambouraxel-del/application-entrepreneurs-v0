'use client';

import { useActionState } from 'react';
import { updateLegalIdentityAction, type FormState } from '@/modules/organizations/actions';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const initialState: FormState = { error: null };

export type LegalIdentityDefaults = {
  legalName: string | null;
  tradeName: string | null;
  legalForm: string | null;
  siren: string | null;
  siret: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressCountry: string;
  professionalEmail: string | null;
  professionalPhone: string | null;
  vatRegime: string;
  vatOnDebits: boolean;
};

export function LegalIdentityForm({ defaults: d }: { defaults: LegalIdentityDefaults }) {
  const [state, formAction, pending] = useActionState(updateLegalIdentityAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <h3 className="text-sm font-semibold text-slate-700">Identité légale</h3>
      <Field label="Raison sociale *" htmlFor="legalName">
        <Input id="legalName" name="legalName" required maxLength={200} defaultValue={d.legalName ?? ''} />
      </Field>
      <Field label="Nom commercial (si différent)" htmlFor="tradeName">
        <Input id="tradeName" name="tradeName" maxLength={200} defaultValue={d.tradeName ?? ''} />
      </Field>
      <Field label="Forme juridique" htmlFor="legalForm">
        <Input id="legalForm" name="legalForm" maxLength={50} placeholder="EI, SASU, SARL…" defaultValue={d.legalForm ?? ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SIREN" htmlFor="siren">
          <Input id="siren" name="siren" maxLength={9} placeholder="9 chiffres" defaultValue={d.siren ?? ''} />
        </Field>
        <Field label="SIRET" htmlFor="siret">
          <Input id="siret" name="siret" maxLength={14} placeholder="14 chiffres" defaultValue={d.siret ?? ''} />
        </Field>
      </div>

      <h3 className="pt-2 text-sm font-semibold text-slate-700">Adresse</h3>
      <Field label="Adresse *" htmlFor="addressLine1">
        <Input id="addressLine1" name="addressLine1" required maxLength={200} defaultValue={d.addressLine1 ?? ''} />
      </Field>
      <Field label="Complément" htmlFor="addressLine2">
        <Input id="addressLine2" name="addressLine2" maxLength={200} defaultValue={d.addressLine2 ?? ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code postal *" htmlFor="addressPostalCode">
          <Input id="addressPostalCode" name="addressPostalCode" required maxLength={20} defaultValue={d.addressPostalCode ?? ''} />
        </Field>
        <Field label="Ville *" htmlFor="addressCity">
          <Input id="addressCity" name="addressCity" required maxLength={120} defaultValue={d.addressCity ?? ''} />
        </Field>
      </div>
      <Field label="Pays (code, ex. FR)" htmlFor="addressCountry">
        <Input id="addressCountry" name="addressCountry" maxLength={2} defaultValue={d.addressCountry} />
      </Field>
      <Field label="E-mail professionnel" htmlFor="professionalEmail">
        <Input id="professionalEmail" name="professionalEmail" type="email" defaultValue={d.professionalEmail ?? ''} />
      </Field>
      <Field label="Téléphone professionnel" htmlFor="professionalPhone">
        <Input id="professionalPhone" name="professionalPhone" type="tel" defaultValue={d.professionalPhone ?? ''} />
      </Field>

      <h3 className="pt-2 text-sm font-semibold text-slate-700">TVA</h3>
      <Field label="Régime de TVA" htmlFor="vatRegime">
        <Select id="vatRegime" name="vatRegime" defaultValue={d.vatRegime}>
          <option value="normal">Normal</option>
          <option value="franchise_en_base">Franchise en base (art. 293 B du CGI)</option>
        </Select>
      </Field>
      <Field label="N° TVA intracommunautaire" htmlFor="vatNumber">
        <Input id="vatNumber" name="vatNumber" maxLength={20} defaultValue={d.vatNumber ?? ''} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="vatOnDebits" defaultChecked={d.vatOnDebits} className="h-4 w-4 rounded border-slate-300" />
        Option TVA sur les débits
      </label>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {!state.error && state !== initialState && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Identité légale enregistrée.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
