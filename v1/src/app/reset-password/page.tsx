'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordReset, type ActionResult } from '@/modules/auth/actions';

const initialState: ActionResult = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indiquez votre e-mail : si un compte existe, un lien de réinitialisation vous sera envoyé.
        </p>

        <form action={formAction} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {state.error === null && pending === false && (
            <p aria-live="polite" className="text-xs text-slate-400">
              Aucune information sur l’existence du compte n’est révélée, par principe.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
