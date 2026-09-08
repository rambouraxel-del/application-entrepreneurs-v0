import { daysBetween } from '@/lib/datetime';
import type { Insight, InsightContext } from './types';

/**
 * Règles du Lot 2 (docs/v1/lot-2-clients-dashboard.md §10) — uniquement ce
 * qui est compatible avec les données existantes (Client, Task). Aucune
 * règle devis/facture : elles n'existent pas encore en V1.
 *
 * Chaque règle est une fonction pure `(ctx) => Insight[]` : même entrée,
 * même sortie, aucun accès DB/horloge caché (la référence "aujourd'hui" est
 * dans `ctx.today`).
 */

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

export const ALL_RULES = [taskOverdue, taskDueToday, clientToFollowUp, clientNoRecentContact];
