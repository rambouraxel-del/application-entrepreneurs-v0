import { daysBetween } from '@/lib/datetime';
import { formatCents } from '@/lib/billing/calc';
import type { Insight, InsightContext } from './types';

/**
 * Règles du Lot 2 (docs/v1/lot-2-clients-dashboard.md §10) puis du Lot 3
 * (docs/v1/lot-3-devis.md §Insights) — uniquement ce qui est compatible avec
 * les données existantes (Client, Task, Quote). Aucune règle facture : elle
 * n'existe pas encore en V1.
 *
 * Chaque règle est une fonction pure `(ctx) => Insight[]` : même entrée,
 * même sortie, aucun accès DB/horloge caché (la référence "aujourd'hui" est
 * dans `ctx.today`).
 */

/** Seuil "proche expiration" — signal à court terme, volontairement fixe (pas
 * un réglage de plus) : ⚑ hypothèse réversible, voir docs/v1/lot-3-devis.md §13. */
const QUOTE_EXPIRY_WARNING_DAYS = 7;

const notArchived = <T extends { archivedAt: Date | null }>(rows: T[]) => rows.filter((r) => r.archivedAt === null);

/** Tâche en retard : échéance passée, non terminée. */
export function taskOverdue(ctx: InsightContext): Insight[] {
  return ctx.tasks
    .filter((t) => !t.completedAt && t.dueDate && t.dueDate.getTime() < ctx.today.getTime())
    .map((t) => ({
      id: `alert-task-overdue-${t.id}`,
      type: 'alert',
      priority: 'critical',
      title: `Tâche en retard : ${t.title}`,
      description: t.clientName ? `Client : ${t.clientName}` : 'Sans client lié',
      actionLabel: 'Voir la tâche',
      actionHref: t.clientId ? `/app/clients/${t.clientId}` : '/app/tasks',
      entityType: 'task',
      entityId: t.id,
    }));
}

/** Tâche due aujourd'hui, non terminée. */
export function taskDueToday(ctx: InsightContext): Insight[] {
  return ctx.tasks
    .filter((t) => !t.completedAt && t.dueDate && t.dueDate.getTime() === ctx.today.getTime())
    .map((t) => ({
      id: `priority-task-today-${t.id}`,
      type: 'priority',
      priority: 'high',
      title: t.title,
      description: t.clientName ? `Client : ${t.clientName}` : "Échéance aujourd'hui",
      actionLabel: 'Voir la tâche',
      actionHref: t.clientId ? `/app/clients/${t.clientId}` : '/app/tasks',
      entityType: 'task',
      entityId: t.id,
    }));
}

/** Client explicitement marqué "à relancer". */
export function clientToFollowUp(ctx: InsightContext): Insight[] {
  return notArchived(ctx.clients)
    .filter((c) => c.status === 'to_follow_up')
    .map((c) => ({
      id: `priority-client-follow-up-${c.id}`,
      type: 'priority',
      priority: 'normal',
      title: `Relancer ${c.name}`,
      description: c.lastContactAt
        ? `Dernier contact le ${c.lastContactAt.toLocaleDateString('fr-FR')}`
        : 'Aucun contact enregistré',
      actionLabel: 'Voir la fiche client',
      actionHref: `/app/clients/${c.id}`,
      entityType: 'client',
      entityId: c.id,
    }));
}

/**
 * Client actif/prospect/fidèle sans contact depuis plus longtemps que le
 * seuil configuré (Organization.clientFollowUpDays). Un client sans AUCUNE
 * date de contact connue est traité comme "sans contact récent" dès sa
 * création (rien d'autre à comparer) — évite de le rendre invisible du
 * Dashboard indéfiniment.
 */
export function clientNoRecentContact(ctx: InsightContext): Insight[] {
  return notArchived(ctx.clients)
    .filter((c) => c.status === 'active' || c.status === 'prospect' || c.status === 'loyal')
    .filter((c) => c.lastContactAt === null || daysBetween(c.lastContactAt, ctx.today) >= ctx.clientFollowUpDays)
    .map((c) => {
      const elapsed = c.lastContactAt ? daysBetween(c.lastContactAt, ctx.today) : null;
      return {
        id: `opportunity-client-no-contact-${c.id}`,
        type: 'opportunity' as const,
        priority: 'normal' as const,
        title: elapsed === null ? `${c.name} — jamais contacté` : `${c.name} — sans contact depuis ${elapsed} jours`,
        description: elapsed === null ? 'Aucune date de dernier contact enregistrée' : `Seuil de relance : ${ctx.clientFollowUpDays} jours`,
        actionLabel: 'Voir la fiche client',
        actionHref: `/app/clients/${c.id}`,
        entityType: 'client' as const,
        entityId: c.id,
      };
    });
}

const openQuotes = (ctx: InsightContext) => ctx.quotes.filter((q) => q.status === 'sent');

/** Devis envoyé, sans réponse depuis plus longtemps que le seuil de relance (Organization.quoteFollowUpDays). */
export function quoteAwaitingResponse(ctx: InsightContext): Insight[] {
  return openQuotes(ctx)
    .filter((q) => q.issuedAt && daysBetween(q.issuedAt, ctx.today) >= ctx.quoteFollowUpDays)
    .map((q) => {
      const elapsed = daysBetween(q.issuedAt!, ctx.today);
      return {
        id: `alert-quote-awaiting-${q.id}`,
        type: 'alert' as const,
        priority: 'high' as const,
        title: `Devis ${q.number ?? ''} sans réponse depuis ${elapsed} jours`,
        description: `${q.clientName} · ${formatCents(q.totalTtcCents)}`,
        actionLabel: 'Voir le devis',
        actionHref: `/app/quotes/${q.id}`,
        entityType: 'quote' as const,
        entityId: q.id,
      };
    });
}

/** Devis envoyé dont la date de validité approche, toujours sans réponse. */
export function quoteNearExpiry(ctx: InsightContext): Insight[] {
  return openQuotes(ctx)
    .filter((q) => q.validUntil !== null)
    .map((q) => ({ ...q, daysLeft: daysBetween(ctx.today, q.validUntil!) }))
    .filter((q) => q.daysLeft >= 0 && q.daysLeft <= QUOTE_EXPIRY_WARNING_DAYS)
    .map((q) => ({
      id: `alert-quote-expiry-${q.id}`,
      type: 'alert' as const,
      priority: 'high' as const,
      title: q.daysLeft === 0 ? `Devis ${q.number ?? ''} expire aujourd'hui` : `Devis ${q.number ?? ''} expire dans ${q.daysLeft} jours`,
      description: `${q.clientName} · ${formatCents(q.totalTtcCents)}`,
      actionLabel: 'Voir le devis',
      actionHref: `/app/quotes/${q.id}`,
      entityType: 'quote' as const,
      entityId: q.id,
    }));
}

/** Devis ouvert (envoyé) d'une valeur ≥ seuil configuré (Organization.quoteHighValueCents). */
export function quoteHighValue(ctx: InsightContext): Insight[] {
  return openQuotes(ctx)
    .filter((q) => q.totalTtcCents >= ctx.quoteHighValueCents)
    .map((q) => ({
      id: `opportunity-quote-high-value-${q.id}`,
      type: 'opportunity' as const,
      priority: 'normal' as const,
      title: `Devis ${q.number ?? ''} à forte valeur — ${formatCents(q.totalTtcCents)}`,
      description: q.clientName,
      actionLabel: 'Voir le devis',
      actionHref: `/app/quotes/${q.id}`,
      entityType: 'quote' as const,
      entityId: q.id,
    }));
}

/** Factures émises avec un restant dû (§42 du compte rendu Lot 4) — jamais draft, jamais entièrement payées. */
const openInvoices = (ctx: InsightContext) =>
  ctx.invoices.filter((inv) => inv.status === 'issued' && inv.totalTtcCents - inv.paidCents > 0);

const INVOICE_DUE_SOON_DAYS = 7; // ⚑ hypothèse fixe, non configurable — voir docs/v1/lot-4-factures-paiements.md §13.

function invoicePartialSuffix(inv: InsightContext['invoices'][number]): string {
  return inv.paidCents > 0 ? ` · payé partiellement (${formatCents(inv.paidCents)})` : '';
}

/** Facture en retard : émise, restant dû, échéance dépassée. */
export function invoiceOverdue(ctx: InsightContext): Insight[] {
  return openInvoices(ctx)
    .filter((inv) => inv.dueDate.getTime() < ctx.today.getTime())
    .map((inv) => {
      const daysLate = daysBetween(inv.dueDate, ctx.today);
      const remaining = inv.totalTtcCents - inv.paidCents;
      return {
        id: `alert-invoice-overdue-${inv.id}`,
        type: 'alert' as const,
        priority: daysLate > 30 ? ('critical' as const) : ('high' as const),
        title: `Facture ${inv.number ?? ''} en retard de ${daysLate} jours`,
        description: `${inv.clientName} · restant dû ${formatCents(remaining)}${invoicePartialSuffix(inv)}`,
        actionLabel: 'Voir la facture',
        actionHref: `/app/invoices/${inv.id}`,
        entityType: 'invoice' as const,
        entityId: inv.id,
      };
    });
}

/** Facture émise, restant dû, échéance dans les prochains jours (pas encore en retard). */
export function invoiceDueSoon(ctx: InsightContext): Insight[] {
  return openInvoices(ctx)
    .map((inv) => ({ ...inv, daysLeft: daysBetween(ctx.today, inv.dueDate) }))
    .filter((inv) => inv.daysLeft >= 0 && inv.daysLeft <= INVOICE_DUE_SOON_DAYS)
    .map((inv) => {
      const remaining = inv.totalTtcCents - inv.paidCents;
      return {
        id: `alert-invoice-due-soon-${inv.id}`,
        type: 'alert' as const,
        priority: 'normal' as const,
        title: inv.daysLeft === 0 ? `Facture ${inv.number ?? ''} échoit aujourd'hui` : `Facture ${inv.number ?? ''} échoit dans ${inv.daysLeft} jours`,
        description: `${inv.clientName} · restant dû ${formatCents(remaining)}${invoicePartialSuffix(inv)}`,
        actionLabel: 'Voir la facture',
        actionHref: `/app/invoices/${inv.id}`,
        entityType: 'invoice' as const,
        entityId: inv.id,
      };
    });
}

// Décision Lot 4 : pas de règle "paiement partiel" séparée — l'information
// (payé partiellement) enrichit déjà `invoiceOverdue`/`invoiceDueSoon` ;
// une facture payée n'a jamais d'insight (§42 : "ne pollue pas le Dashboard").

export const ALL_RULES = [
  taskOverdue,
  taskDueToday,
  clientToFollowUp,
  clientNoRecentContact,
  quoteAwaitingResponse,
  quoteNearExpiry,
  quoteHighValue,
  invoiceOverdue,
  invoiceDueSoon,
];
