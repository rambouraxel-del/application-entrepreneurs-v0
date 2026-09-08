import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
import { getOrganization } from '@/modules/organizations/service';
import { signOut } from '@/modules/auth/actions';

/**
 * Coquille de la zone authentifiée. Volontairement minimale — pas le
 * Dashboard décisionnel (Lot 2) : juste de quoi vérifier le socle (session,
 * organisation courante, navigation vers Clients).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(); // redirige vers /login si absent
  const ctx = await resolveDefaultTenantContext(session);
  if (!ctx) redirect('/app/onboarding');
  const organization = await getOrganization(ctx);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between bg-slate-900 px-4 py-6 text-slate-100">
        <div>
          <div className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
              CE
            </span>
            <span className="text-sm font-semibold">Cockpit Entrepreneur</span>
          </div>
          <nav className="space-y-1">
            <Link href="/app" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-800">
              Accueil
            </Link>
            <Link href="/app/clients" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-800">
              Clients
            </Link>
          </nav>
        </div>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800">
            Se déconnecter
          </button>
        </form>
      </aside>

      <div className="flex-1 bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Organisation</p>
          <h1 className="text-lg font-semibold text-slate-900">{organization.name}</h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
