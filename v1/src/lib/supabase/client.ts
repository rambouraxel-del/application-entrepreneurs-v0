'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur. Utilisé uniquement pour les formulaires
 * d'authentification (connexion, inscription, déconnexion) : la session est
 * ensuite portée par des cookies HttpOnly gérés par @supabase/ssr, jamais
 * lue ou stockée manuellement par notre code.
 *
 * Seules NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (publiques par construction,
 * protégée par les policies Supabase) atteignent le navigateur — jamais
 * SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes — voir .env.example.',
    );
  }
  return createBrowserClient(url, anonKey);
}
