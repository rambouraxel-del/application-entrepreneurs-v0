import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { todayInTimezone } from '@/lib/datetime';
import { compute, type InsightsResult } from '@/modules/insights/engine';
import type { InsightClient, InsightTask } from '@/modules/insights/types';

export type DashboardSnapshot = {
  situation: {
    activeClients: number;
    prospects: number;
    toFollowUp: number;
  };
  today: Date;
  insights: InsightsResult;
};

/**
 * Point d'entrée UNIQUE du Dashboard — une fonction serveur qui agrège tout
 * (docs/v1/lot-2-clients-dashboard.md §Requêtes) plutôt qu'une multitude de
 * requêtes séparées côté client. Toujours appelée via `withTenant` : les
 * données restent scopées tenant (extension + RLS), comme tout le reste.
 */
export async function getDashboardSnapshot(ctx: TenantContext): Promise<DashboardSnapshot> {
  const today = todayInTimezone();

  return withTenant(ctx, async (db) => {
    const [activeClients, prospects, toFollowUp, organization, clientRows, taskRows] = await Promise.all([
      db.client.count({ where: { archivedAt: null, status: 'active' } }),
      db.client.count({ where: { archivedAt: null, status: 'prospect' } }),
      db.client.count({ where: { archivedAt: null, status: 'to_follow_up' } }),
      db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { clientFollowUpDays: true } }),
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

    const insights = compute({
      today,
      clients,
      tasks,
      clientFollowUpDays: organization.clientFollowUpDays,
    });

    return {
      situation: { activeClients, prospects, toFollowUp },
      today,
      insights,
    };
  });
}
