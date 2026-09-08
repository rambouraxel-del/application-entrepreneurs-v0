import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import { getDashboardSnapshot } from '@/modules/dashboard/service';
import { todayInTimezone } from '@/lib/datetime';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * Dashboard (docs/v1/lot-2-clients-dashboard.md §Dashboard) : agrégats et
 * insights à partir de vraies données PostgreSQL, aucune donnée financière.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('getDashboardSnapshot', () => {
  it('compte les clients par statut, hors archivés', async () => {
    await systemDb.client.create({ data: { organizationId: f.orgA, name: 'Actif', status: 'active' } });
    await systemDb.client.create({ data: { organizationId: f.orgA, name: 'Prospect', status: 'prospect' } });
    await systemDb.client.create({
      data: { organizationId: f.orgA, name: 'Archivé actif', status: 'active', archivedAt: new Date() },
    });

    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.situation.activeClients).toBe(1);
    // +1 : le "Client A" du fixture partagé (tests/helpers.ts) est déjà 'prospect' par défaut.
    expect(snapshot.situation.prospects).toBe(2);
  });

  it('remonte les tâches en retard et du jour dans les insights', async () => {
    const today = todayInTimezone();
    const yesterday = new Date(today.getTime() - 86_400_000);
    await systemDb.task.create({ data: { organizationId: f.orgA, title: 'En retard', dueDate: yesterday } });
    await systemDb.task.create({ data: { organizationId: f.orgA, title: "Aujourd'hui", dueDate: today } });

    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.insights.alerts.some((i) => i.title.includes('En retard'))).toBe(true);
    expect(snapshot.insights.priorities.some((i) => i.title === "Aujourd'hui")).toBe(true);
  });

  it('remonte un client à relancer dans les priorités', async () => {
    const client = await systemDb.client.create({
      data: { organizationId: f.orgA, name: 'À relancer', status: 'to_follow_up' },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    const insight = snapshot.insights.priorities.find((i) => i.entityId === client.id);
    expect(insight).toBeDefined();
    expect(insight!.actionHref).toBe(`/app/clients/${client.id}`);
  });

  it("n'affiche jamais rien de B dans le Dashboard de A", async () => {
    const snapshot = await getDashboardSnapshot(ctxA());
    const allInsightIds = [
      ...snapshot.insights.alerts,
      ...snapshot.insights.priorities,
      ...snapshot.insights.opportunities,
    ].map((i) => i.entityId);
    expect(allInsightIds).not.toContain(f.clientB);
    expect(allInsightIds).not.toContain(f.taskB);
  });

  it('respecte le seuil de relance configuré par organisation', async () => {
    await systemDb.organization.update({ where: { id: f.orgA }, data: { clientFollowUpDays: 5 } });
    const today = todayInTimezone();
    const sixDaysAgo = new Date(today.getTime() - 6 * 86_400_000);
    const client = await systemDb.client.create({
      data: { organizationId: f.orgA, name: 'Ancien contact', status: 'active', lastContactAt: sixDaysAgo },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.insights.opportunities.some((i) => i.entityId === client.id)).toBe(true);
  });
});
