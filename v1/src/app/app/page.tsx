import Link from 'next/link';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getDashboardSnapshot } from '@/modules/dashboard/service';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCents } from '@/modules/quotes/calc';
import type { Insight } from '@/modules/insights/types';

/**
 * Premier Dashboard réel (Lot 2), étendu au Lot 3 avec les devis réels —
 * toujours 100% PostgreSQL, sans métrique financière fictive (pas de CA :
 * aucune facture n'existe encore, docs/v1/lot-3-devis.md §9). Hiérarchie
 * reprise du positionnement produit : Ma situation / À surveiller / Mes
 * priorités / Opportunités. Pas de section Performance financière.
 *
 * Server Component par défaut : une seule fonction serveur
 * (getDashboardSnapshot) agrège tout, pas de requêtes séparées côté client.
 */
export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const snapshot = await getDashboardSnapshot(ctx);
  const { situation, insights } = snapshot;
  const hasAnyInsight = insights.alerts.length + insights.priorities.length + insights.opportunities.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Situation réelle, calculée à partir de vos clients, tâches et devis.</p>
      </div>

      <section aria-labelledby="situation-heading">
        <h2 id="situation-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ma situation
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Clients actifs" value={situation.activeClients} href="/app/clients?status=active" />
          <StatCard label="Prospects" value={situation.prospects} href="/app/clients?status=prospect" />
          <StatCard label="À relancer" value={situation.toFollowUp} href="/app/clients?status=to_follow_up" />
          <StatCard label="Devis en cours" value={situation.openQuotes} href="/app/quotes?status=sent" />
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Valeur devis ouverts</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatCents(situation.openQuotesValueCents)}</p>
          </Card>
        </div>
      </section>

      {!hasAnyInsight && (
        <EmptyState
          title="Rien à signaler pour le moment"
          description="Ajoutez des clients et des tâches pour voir apparaître vos priorités et opportunités ici."
          action={
            <Link href="/app/clients/new" className="text-sm font-medium text-indigo-600 hover:underline">
              Créer un client
            </Link>
          }
        />
      )}

      {insights.alerts.length > 0 && (
        <InsightSection id="watch" title="À surveiller" items={insights.alerts} />
      )}

      {insights.priorities.length > 0 && (
        <InsightSection id="priorities" title="Mes priorités" items={insights.priorities} />
      )}

      {insights.opportunities.length > 0 && (
        <InsightSection id="opportunities" title="Opportunités" items={insights.opportunities} />
      )}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-indigo-300">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </Card>
    </Link>
  );
}

const TONE_BY_PRIORITY = { critical: 'danger', high: 'warning', normal: 'info' } as const;

function InsightSection({ id, title, items }: { id: string; title: string; items: Insight[] }) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((insight) => (
          <Card key={insight.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{insight.title}</CardTitle>
                <Badge tone={TONE_BY_PRIORITY[insight.priority]}>
                  {insight.priority === 'critical' ? 'Urgent' : insight.priority === 'high' ? 'Important' : 'Normal'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{insight.description}</p>
            </div>
            <Link
              href={insight.actionHref}
              className="whitespace-nowrap text-sm font-medium text-indigo-600 hover:underline"
            >
              {insight.actionLabel}
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
