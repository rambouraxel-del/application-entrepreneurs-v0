'use client';

import Link from 'next/link';
import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, type ActionResult } from '@/modules/auth/actions';

const initialState: ActionResult = { error: null };

function ConfirmNotice() {
  const params = useSearchParams();
  if (params.get('confirm') !== '1') return null;
  return (
    <p className="mt-4 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
      Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Cockpit Entrepreneur</h1>
        <p className="mt-1 text-sm text-slate-500">Connexion</p>

        <Suspense fallback={null}>
          <ConfirmNotice />
        </Suspense>

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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
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
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <Link href="/reset-password" className="text-indigo-600 hover:underline">
            Mot de passe oublié ?
          </Link>
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
