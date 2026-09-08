import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchit la session Supabase à chaque requête et protège la zone
 * authentifiée. Pattern recommandé par Supabase pour Next.js App Router
 * (middleware + @supabase/ssr) — pas de vérification de token artisanale.
 *
 * ⚠️ VALIDATION CLOUD REQUISE : logique réelle, non exécutée contre un projet
 * Supabase dans cet environnement (docs/v1/lot-1-socle.md).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Pas de projet Supabase configuré : on laisse passer sans forcer de
    // redirection, pour ne pas rendre toute la zone (app) inaccessible dans
    // cet environnement de développement du Lot 1. En production, ces
    // variables sont obligatoires (voir .env.example).
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPrivateRoute = request.nextUrl.pathname.startsWith('/app');
  if (isPrivateRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
