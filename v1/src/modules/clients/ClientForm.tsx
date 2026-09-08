'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';

type ClientFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaultValues?: {
    kind?: string;
    name?: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

const initialState: FormState = { error: null };

export function ClientForm({ action, submitLabel, defaultValues }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      <div>
        <label htmlFor="kind" className="block text-sm font-medium text-slate-700">
          Type
        </label>
        <select
          id="kind"
          name="kind"
          defaultValue={defaultValues?.kind ?? 'individual'}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        >
          <option value="individual">Particulier</option>
          <option value="company">Entreprise</option>
        </select>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Nom *
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
          Entreprise (optionnel)
        </label>
        <input
          id="companyName"
          name="companyName"
          maxLength={200}
          defaultValue={defaultValues?.companyName ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-mail (optionnel)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Téléphone (optionnel)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : submitLabel}
      </button>
    </form>
  );
}
