import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { todayInTimezone } from '@/lib/datetime';
import { compute, type InsightsResult } from '@/modules/insights/engine';
import { computePaymentAmounts } from '@/modules/invoices/paymentStatus';
import type { InsightClient, InsightTask, InsightQuote, InsightInvoice } from '@/modules/insights/types';

export type DashboardSnapshot = {
  situation: {
    activeClients: number;
    prospects: number;
    toFollowUp: number;
    /** Devis envoyés, en attente de réponse. */
    openQuotes: number;
    /** Valeur TTC cumulée des devis envoyés — PAS un chiffre d'affaires. */
    openQuotesValueCents: number;
    /**
     * Définitions explicites (docs/v1/lot-4-factures-paiements.md §41) —
     * jamais nommé "chiffre d'affaires" (notion comptable/fiscale non établie ici) :
     *   - billedCents     = somme de total_ttc_cents des factures ÉMISES (cumul, pas de fenêtre de dates au Lot 4).
     *   - outstandingCents = somme des restants dus (> 0) des factures émises.
     *   - overdueCents     = somme des restants dus des factures émises dont dueDate < aujourd'hui.
     *   - collectedCents   = somme des montants des paiements ACTIFS (non annulés), cumul.
     */
    billedCents: number;
    outstandingCents: number;
    overdueCents: number;
    overdueInvoicesCount: number;
    collectedCents: number;
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
 * Lot 4 : ajoute les factures/paiements réels. "Facturé"/"À encaisser"/
 * "En retard"/"Encaissé" — jamais "chiffre d'affaires" (docs/v1/lot-4-factures-paiements.md §29).
 * Devis et factures ne sont jamais additionnés (§40 : pas de double-comptage).
 */
export async function getDashboardSnapshot(ctx: TenantContext): Promise<DashboardSnapshot> {
  const today = todayInTimezone();

  return withTenant(ctx, async (db) => {
    const [activeClients, prospects, toFollowUp, openQuotesAgg, organization, clientRows, taskRows, quoteRows, invoiceRows] =
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
          select: { id: true, title: true, clientId: true, dueDate: true, completedAt: true, client: { select: { name: true } } },
        }),
        db.quote.findMany({
          where: { status: 'sent' },
          select: { id: true, number: true, clientId: true, status: true, issuedAt: true, validUntil: true, totalTtcCents: true, client: { select: { name: true } } },
        }),
        db.invoice.findMany({
          where: { status: 'issued' },
          select: {
            id: true, number: true, clientId: true, status: true, issuedAt: true, dueDate: true, totalTtcCents: true,
            client: { select: { name: true } },
            payments: { select: { amountCents: true, cancelledAt: true } },
          },
        }),
      ]);

    const clients: InsightClient[] = clientRows.map((c) => ({
      id: c.id, name: c.name, status: c.status, lastContactAt: c.lastContactAt, archivedAt: c.archivedAt,
    }));
    const tasks: InsightTask[] = taskRows.map((t) => ({
      id: t.id, title: t.title, clientId: t.clientId, clientName: t.client?.name ?? null, dueDate: t.dueDate, completedAt: t.completedAt,
    }));
    const quotes: InsightQuote[] = quoteRows.map((q) => ({
      id: q.id, number: q.number, clientId: q.clientId, clientName: q.client.name, status: q.status, issuedAt: q.issuedAt, validUntil: q.validUntil, totalTtcCents: q.totalTtcCents,
    }));

    let billedCents = 0;
    let outstandingCents = 0;
    let overdueCents = 0;
    let overdueInvoicesCount = 0;
    let collectedCents = 0;
    const invoices: InsightInvoice[] = invoiceRows.map((inv) => {
      const { paidCents, remainingCents } = computePaymentAmounts(inv.totalTtcCents, inv.payments);
      billedCents += inv.totalTtcCents;
      collectedCents += paidCents;
      if (remainingCents > 0) {
        outstandingCents += remainingCents;
        if (inv.dueDate.getTime() < today.getTime()) {
          overdueCents += remainingCents;
          overdueInvoicesCount += 1;
        }
      }
      return {
        id: inv.id, number: inv.number, clientId: inv.clientId, clientName: inv.client.name, status: inv.status,
        issuedAt: inv.issuedAt, dueDate: inv.dueDate, totalTtcCents: inv.totalTtcCents, paidCents,
      };
    });

    const insights = compute({
      today, clients, tasks, quotes, invoices,
      clientFollowUpDays: organization.clientFollowUpDays,
      quoteFollowUpDays: organization.quoteFollowUpDays,
      quoteHighValueCents: organization.quoteHighValueCents,
    });

    return {
      situation: {
        activeClients, prospects, toFollowUp,
        openQuotes: openQuotesAgg._count,
        openQuotesValueCents: openQuotesAgg._sum.totalTtcCents ?? 0,
        billedCents, outstandingCents, overdueCents, overdueInvoicesCount, collectedCents,
      },
      today,
      insights,
    };
  });
}
