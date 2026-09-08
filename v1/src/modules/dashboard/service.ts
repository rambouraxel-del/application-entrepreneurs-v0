import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { todayInTimezone } from '@/lib/datetime';
import { compute, type InsightsResult } from '@/modules/insights/engine';
import type { InsightClient, InsightTask, InsightQuote } from '@/modules/insights/types';

export type DashboardSnapshot = {
  situation: {
    activeClients: number;
    prospects: number;
    toFollowUp: number;
    /** Devis envoyés, en attente de réponse. */
    openQuotes: number;
    /** Valeur TTC cumulée des devis envoyés — PAS un chiffre d'affaires (aucune facture n'existe encore). */
    openQuotesValueCents: number;
  };
  today: Date;
  insights: InsightsResult;
};

/**
 * Point d'entrée UNIQUE du Dashboard — une fonction serveur qui agrège tout
 * (docs/v1/lot-2-clients-dashboard.md §Requêtes) plutôt qu'une multitude de
 * requêtes séparées côté client. Toujours appelée via `withTenant` : les
 * données restent scopées tenant (extension + RLS), comme tout le reste.
 *
 * Lot 3 : ajoute les devis réels, sans jamais afficher de métrique
 * financière fictive (pas de CA, pas de trésorerie — aucune facture
 * n'existe encore, docs/v1/lot-3-devis.md §9).
 */
export async function getDashboardSnapshot(ctx: TenantContext): Promise<DashboardSnapshot> {
  const today = todayInTimezone();

  return withTenant(ctx, async (db) => {
    const [activeClients, prospects, toFollowUp, openQuotesAgg, organization, clientRows, taskRows, quoteRows] =
      await Promise.all([
        db.client.count({ where: { archivedAt: null, status: 'active' } }),
        db.client.count({ where: { archivedAt: null, status: 'prospect' } }),
        db.client.count({ where: { archivedAt: null, status: 'to_follow_up' } }),
        db.quote.aggregate({ where: { status: 'sent' }, _count: true, _sum: { totalTtcCents: true } }),
        db.organization.findUniqueOrThrow({
          where: { id: ctx.organizationId },
          select: { clientFollowUpDays: true, quoteFollowUpDays: true, quoteHighValueCents: true },
        }),
        db.client.findMany({
          where: { archivedAt: null },
          select: { id: true, name: true, status: true, lastContactAt: true, archivedAt: true },
        }),
        db.task.findMany({
          where: { completedAt: null },
          select: {
            id: true,
            title: true,
            clientId: true,
            dueDate: true,
            completedAt: true,
            client: { select: { name: true } },
          },
        }),
        db.quote.findMany({
          where: { status: 'sent' },
          select: {
            id: true,
            number: true,
            clientId: true,
            status: true,
            issuedAt: true,
            validUntil: true,
            totalTtcCents: true,
            client: { select: { name: true } },
          },
        }),
      ]);

    const clients: InsightClient[] = clientRows.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      lastContactAt: c.lastContactAt,
      archivedAt: c.archivedAt,
    }));
    const tasks: InsightTask[] = taskRows.map((t) => ({
      id: t.id,
      title: t.title,
      clientId: t.clientId,
      clientName: t.client?.name ?? null,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
    }));
    const quotes: InsightQuote[] = quoteRows.map((q) => ({
      id: q.id,
      number: q.number,
      clientId: q.clientId,
      clientName: q.client.name,
      status: q.status,
      issuedAt: q.issuedAt,
      validUntil: q.validUntil,
      totalTtcCents: q.totalTtcCents,
    }));

    const insights = compute({
      today,
      clients,
      tasks,
      quotes,
      clientFollowUpDays: organization.clientFollowUpDays,
      quoteFollowUpDays: organization.quoteFollowUpDays,
      quoteHighValueCents: organization.quoteHighValueCents,
    });

    return {
      situation: {
        activeClients,
        prospects,
        toFollowUp,
        openQuotes: openQuotesAgg._count,
        openQuotesValueCents: openQuotesAgg._sum.totalTtcCents ?? 0,
      },
      today,
      insights,
    };
  });
}
