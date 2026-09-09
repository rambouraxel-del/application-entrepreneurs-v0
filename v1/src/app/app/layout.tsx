import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext, getOrganization } from '@/modules/organizations/service';
import { signOut } from '@/modules/auth/actions';

/**
 * Coquille de la zone authentifiée. Navigation minimale (docs/v1/lot-2-clients-dashboard.md
 * §Navigation) : Dashboard, Clients, Tâches, Réglages, déconnexion — jamais
 * de lien vers un module qui n'existe pas encore (Facturation, Trésorerie,
 * Analyses).
 *
 * Responsive : la sidebar fixe (desktop) devient une barre horizontale en
 * haut sur mobile (~390px), sans JavaScript — un simple changement de mise
 * en page en CSS (docs/v1/lot-2-clients-dashboard.md §UX/mobile).
 */
const NAV_LINKS = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/clients', label: 'Clients' },
  { href: '/app/quotes', label: 'Devis' },
  { href: '/app/invoices', label: 'Factures' },
  { href: '/app/tasks', label: 'Tâches' },
  { href: '/app/settings', label: 'Réglages' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(); // redirige vers /login si absent
  const ctx = await resolveDefaultTenantContext(session);
  if (!ctx) redirect('/app/onboarding');
  const organization = await getOrganization(ctx);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col justify-between bg-slate-900 px-4 py-4 text-slate-100 md:w-56 md:py-6">
        <div>
          <div className="mb-4 flex items-center justify-between gap-2 px-2 md:mb-8 md:justify-start">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
                CE
              </span>
              <span className="text-sm font-semibold">Cockpit Entrepreneur</span>
            </div>
            <form action={signOut} className="md:hidden">
              <button type="submit" className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">
                Déconnexion
              </button>
            </form>
          </div>
          <nav aria-label="Navigation principale" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:pb-0 md:space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={signOut} className="hidden md:block">
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800">
            Se déconnecter
          </button>
        </form>
      </aside>

      <div className="flex-1 bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Organisation</p>
          <h1 className="text-lg font-semibold text-slate-900">{organization.name}</h1>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
