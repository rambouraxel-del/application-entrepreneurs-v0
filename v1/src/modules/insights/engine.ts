import { todayInTimezone } from '@/lib/datetime';
import { ALL_RULES } from './rules';
import type { Insight, InsightContext } from './types';

const PRIORITY_RANK: Record<Insight['priority'], number> = { critical: 0, high: 1, normal: 2 };

function sortByPriority(list: Insight[]): Insight[] {
  return [...list].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** Complète un contexte partiel avec des valeurs par défaut sûres (mêmes principes que le moteur V0). */
export function normalizeContext(raw: Partial<InsightContext>): InsightContext {
  return {
    today: raw.today ?? todayInTimezone(),
    clients: raw.clients ?? [],
    tasks: raw.tasks ?? [],
    clientFollowUpDays: raw.clientFollowUpDays ?? 30,
  };
}

export type InsightsResult = {
  alerts: Insight[];
  priorities: Insight[];
  opportunities: Insight[];
};

/** Orchestration — même découpage que le moteur V0 (alerts/priorities/opportunities). */
export function compute(rawContext: Partial<InsightContext>): InsightsResult {
  const ctx = normalizeContext(rawContext);
  const all = ALL_RULES.flatMap((rule) => rule(ctx));
  return {
    alerts: sortByPriority(all.filter((i) => i.type === 'alert')),
    priorities: sortByPriority(all.filter((i) => i.type === 'priority')),
    opportunities: sortByPriority(all.filter((i) => i.type === 'opportunity')),
  };
}
