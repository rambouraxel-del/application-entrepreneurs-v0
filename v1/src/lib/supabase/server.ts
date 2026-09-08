import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route
 * Handlers). Utilise les cookies de la requête pour lire/rafraîchir la
 * session — c'est la pratique recommandée par Supabase pour Next.js App
 * Router (SSR via @supabase/ssr), pas un stockage de token artisanal.
 *
 * ⚠️ VALIDATION CLOUD REQUISE (docs/v1/lot-1-socle.md) : ce module est du
 * code d'intégration réel, mais aucun projet Supabase n'était accessible
 * pour l'exécuter dans cet environnement. Renseigner NEXT_PUBLIC_SUPABASE_URL
 * et NEXT_PUBLIC_SUPABASE_ANON_KEY (.env) avant la première utilisation réelle.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component (lecture seule) : le
          // rafraîchissement de session est alors assuré par le middleware.
          // Ce n'est pas une erreur, c'est le fonctionnement documenté de
          // @supabase/ssr pour Next.js App Router.
        }
      },
    },
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} manquante. Aucun projet Supabase configuré — voir .env.example et ` +
        `docs/v1/lot-1-socle.md "VALIDATION CLOUD REQUISE".`,
    );
  }
  return value;
}
