'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createOrganizationForNewUser } from '@/modules/organizations/service';

/**
 * Server Actions d'authentification.
 *
 * Séquence de chaque action, conforme à docs/v1/architecture.md §5 :
 *   1. valider l'entrée (Zod) ;
 *   2. appeler Supabase Auth (jamais de mot de passe/session géré à la main) ;
 *   3. sur erreur, retourner un message métier explicite (jamais une exception
 *      brute affichée à l'utilisateur).
 *
 * ⚠️ VALIDATION CLOUD REQUISE : logique réelle, non exécutée contre un projet
 * Supabase dans cet environnement — voir docs/v1/lot-1-socle.md.
 */

export type ActionResult = { error: string } | { error: null };

const signUpSchema = z.object({
  email: z.string().trim().min(1, 'E-mail requis').email('E-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  organizationName: z.string().trim().min(1, "Le nom de l'entreprise est requis").max(200),
});

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    organizationName: formData.get('organizationName'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${requireAppUrl()}/app` },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Inscription impossible : réessayez plus tard.' };

  // Organisation + premier membership, dans la même transaction (rôle
  // système — voir organizations/service.ts). Fonctionne que la confirmation
  // d'e-mail soit requise ou non : seul l'identifiant utilisateur est nécessaire.
  await createOrganizationForNewUser({ userId: data.user.id, email: data.user.email ?? null }, parsed.data.organizationName);

  if (!data.session) {
    redirect('/login?confirm=1');
  }
  redirect('/app');
}

const signInSchema = z.object({
  email: z.string().trim().min(1, 'E-mail requis').email('E-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'E-mail ou mot de passe incorrect.' };

  redirect('/app');
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

const resetSchema = z.object({ email: z.string().trim().email('E-mail invalide') });

/** Envoie un e-mail de réinitialisation. Supabase gère le jeton et son expiration. */
export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'E-mail invalide' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${requireAppUrl()}/reset-password`,
  });
  // Réponse identique en succès et en échec : on ne révèle jamais si un
  // e-mail est enregistré (énumération de comptes).
  if (error) return { error: null };
  return { error: null };
}

function requireAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
