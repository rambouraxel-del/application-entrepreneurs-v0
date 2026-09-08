import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Session applicative — lit l'utilisateur authentifié Supabase côté serveur.
 * `getUser()` (et non `getSession()`) est utilisé volontairement : il revalide
 * le jeton auprès du serveur Supabase à chaque appel, contrairement à
 * `getSession()` qui ne fait que lire les cookies (falsifiable côté client).
 * C'est la recommandation Supabase pour tout code serveur.
 *
 * ⚠️ VALIDATION CLOUD REQUISE : logique réelle, non exécutée contre un projet
 * Supabase dans cet environnement.
 */
export type Session = { userId: string; email: string | null };

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email ?? null };
}

/** À utiliser en tête de toute Server Action ou page privée. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
