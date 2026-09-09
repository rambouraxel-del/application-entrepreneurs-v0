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

  it('compte les devis ouverts (envoyés) et leur valeur cumulée — jamais un CA', async () => {
    await systemDb.quote.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'sent', totalTtcCents: 10000 },
    });
    await systemDb.quote.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'sent', totalTtcCents: 5000 },
    });
    await systemDb.quote.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'draft', totalTtcCents: 999_999 },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.situation.openQuotes).toBe(2);
    expect(snapshot.situation.openQuotesValueCents).toBe(15000);
  });

  it('remonte un devis à forte valeur dans les opportunités', async () => {
    await systemDb.organization.update({ where: { id: f.orgA }, data: { quoteHighValueCents: 10000 } });
    const quote = await systemDb.quote.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'sent', totalTtcCents: 20000 },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.insights.opportunities.some((i) => i.entityId === quote.id)).toBe(true);
  });

  it('remonte un devis sans réponse depuis trop longtemps dans les alertes', async () => {
    await systemDb.organization.update({ where: { id: f.orgA }, data: { quoteFollowUpDays: 3 } });
    const issuedAt = new Date(todayInTimezone().getTime() - 5 * 86_400_000);
    const quote = await systemDb.quote.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'sent', issuedAt, totalTtcCents: 1000 },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.insights.alerts.some((i) => i.entityId === quote.id)).toBe(true);
  });

  it("n'affiche jamais un devis de B dans le Dashboard de A", async () => {
    const quoteB = await systemDb.quote.create({
      data: { organizationId: f.orgB, clientId: f.clientB, status: 'sent', totalTtcCents: 999_999_99 },
    });
    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.situation.openQuotesValueCents).toBe(0);
    const allInsightIds = [
      ...snapshot.insights.alerts,
      ...snapshot.insights.priorities,
      ...snapshot.insights.opportunities,
    ].map((i) => i.entityId);
    expect(allInsightIds).not.toContain(quoteB.id);
  });

  it('calcule Facturé/À encaisser/En retard/Encaissé avec des définitions exactes (§41)', async () => {
    const today = todayInTimezone();
    const past = new Date(today.getTime() - 10 * 86_400_000);
    const future = new Date(today.getTime() + 10 * 86_400_000);

    // Facture émise, entièrement payée : ne doit ni être "outstanding" ni "overdue".
    const paid = await systemDb.invoice.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'issued', issuedAt: past, supplyDate: past, dueDate: future, totalHtCents: 10000, totalVatCents: 2000, totalTtcCents: 12000 },
    });
    await systemDb.payment.create({ data: { organizationId: f.orgA, invoiceId: paid.id, amountCents: 12000, paidAt: today, method: 'bank_transfer' } });

    // Facture émise, partiellement payée, échéance future : outstanding mais pas overdue.
    const partial = await systemDb.invoice.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'issued', issuedAt: past, supplyDate: past, dueDate: future, totalHtCents: 10000, totalVatCents: 2000, totalTtcCents: 12000 },
    });
    await systemDb.payment.create({ data: { organizationId: f.orgA, invoiceId: partial.id, amountCents: 5000, paidAt: today, method: 'card' } });

    // Facture émise, impayée, échéance dépassée : overdue.
    const overdue = await systemDb.invoice.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'issued', issuedAt: past, supplyDate: past, dueDate: past, totalHtCents: 5000, totalVatCents: 1000, totalTtcCents: 6000 },
    });

    // Paiement annulé : ne doit compter ni dans collectedCents ni réduire outstanding.
    const cancelledPay = await systemDb.payment.create({ data: { organizationId: f.orgA, invoiceId: overdue.id, amountCents: 6000, paidAt: today, method: 'cash' } });
    await systemDb.payment.update({ where: { id: cancelledPay.id }, data: { cancelledAt: today, cancellationReason: 'Erreur de saisie' } });

    // Brouillon : ne doit apparaître dans aucun agrégat.
    await systemDb.invoice.create({
      data: { organizationId: f.orgA, clientId: f.clientA, status: 'draft', supplyDate: today, dueDate: future, totalHtCents: 999_999, totalVatCents: 0, totalTtcCents: 999_999 },
    });

    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.situation.billedCents).toBe(12000 + 12000 + 6000);
    expect(snapshot.situation.outstandingCents).toBe(7000 + 6000);
    expect(snapshot.situation.overdueCents).toBe(6000);
    expect(snapshot.situation.overdueInvoicesCount).toBe(1);
    expect(snapshot.situation.collectedCents).toBe(12000 + 5000);
  });

  it("n'affiche jamais les factures/paiements de B dans le Dashboard de A", async () => {
    const today = todayInTimezone();
    const invoiceB = await systemDb.invoice.create({
      data: { organizationId: f.orgB, clientId: f.clientB, status: 'issued', issuedAt: today, supplyDate: today, dueDate: today, totalHtCents: 999_999, totalVatCents: 0, totalTtcCents: 999_999 },
    });
    await systemDb.payment.create({ data: { organizationId: f.orgB, invoiceId: invoiceB.id, amountCents: 999_999, paidAt: today, method: 'bank_transfer' } });

    const snapshot = await getDashboardSnapshot(ctxA());
    expect(snapshot.situation.billedCents).toBe(0);
    expect(snapshot.situation.collectedCents).toBe(0);
  });
});
