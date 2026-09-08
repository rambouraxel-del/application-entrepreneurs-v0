import { describe, it, expect } from 'vitest';
import { compute } from '@/modules/insights/engine';
import { taskOverdue, taskDueToday, clientToFollowUp, clientNoRecentContact } from '@/modules/insights/rules';
import type { InsightClient, InsightContext, InsightTask } from '@/modules/insights/types';
import { todayInTimezone, daysBetween } from '@/lib/datetime';

/**
 * Moteur d'insights V1 (docs/v1/lot-2-clients-dashboard.md §Insights). Pas
 * d'accès DB/horloge : la date de référence est toujours injectée, pour des
 * tests déterministes indépendants du jour d'exécution.
 */

const TODAY = new Date(Date.UTC(2026, 5, 15)); // 15 juin 2026, fixe

function client(overrides: Partial<InsightClient> = {}): InsightClient {
  return { id: 'c1', name: 'Client Test', status: 'active', lastContactAt: null, archivedAt: null, ...overrides };
}

function task(overrides: Partial<InsightTask> = {}): InsightTask {
  return { id: 't1', title: 'Tâche test', clientId: null, clientName: null, dueDate: null, completedAt: null, ...overrides };
}

function ctx(overrides: Partial<InsightContext> = {}): InsightContext {
  return { today: TODAY, clients: [], tasks: [], clientFollowUpDays: 30, ...overrides };
}

describe('taskOverdue', () => {
  it('se déclenche sur une tâche non terminée dont l’échéance est passée', () => {
    const result = taskOverdue(ctx({ tasks: [task({ dueDate: new Date(Date.UTC(2026, 5, 10)) })] }));
    expect(result).toHaveLength(1);
    expect(result[0]!.priority).toBe('critical');
  });

  it('ne se déclenche pas sur une tâche terminée, même en retard', () => {
    const result = taskOverdue(
      ctx({ tasks: [task({ dueDate: new Date(Date.UTC(2026, 5, 10)), completedAt: new Date() })] }),
    );
    expect(result).toHaveLength(0);
  });

  it('ne se déclenche pas sur une tâche due aujourd’hui (limite)', () => {
    const result = taskOverdue(ctx({ tasks: [task({ dueDate: TODAY })] }));
    expect(result).toHaveLength(0);
  });

  it('ne se déclenche pas sans échéance', () => {
    expect(taskOverdue(ctx({ tasks: [task({ dueDate: null })] }))).toHaveLength(0);
  });

  it('aucune donnée -> aucun insight', () => {
    expect(taskOverdue(ctx())).toHaveLength(0);
  });
});

describe('taskDueToday', () => {
  it('se déclenche exactement à la date du jour', () => {
    const result = taskDueToday(ctx({ tasks: [task({ dueDate: TODAY })] }));
    expect(result).toHaveLength(1);
    expect(result[0]!.priority).toBe('high');
  });

  it('ne se déclenche pas la veille ni le lendemain', () => {
    const veille = new Date(TODAY.getTime() - 86_400_000);
    const lendemain = new Date(TODAY.getTime() + 86_400_000);
    expect(taskDueToday(ctx({ tasks: [task({ dueDate: veille })] }))).toHaveLength(0);
    expect(taskDueToday(ctx({ tasks: [task({ dueDate: lendemain })] }))).toHaveLength(0);
  });

  it('ne se déclenche pas sur une tâche déjà terminée', () => {
    expect(taskDueToday(ctx({ tasks: [task({ dueDate: TODAY, completedAt: TODAY })] }))).toHaveLength(0);
  });
});

describe('clientToFollowUp', () => {
  it("se déclenche pour un client au statut 'to_follow_up'", () => {
    const result = clientToFollowUp(ctx({ clients: [client({ status: 'to_follow_up' })] }));
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toContain('Relancer');
  });

  it('ne se déclenche pas pour les autres statuts', () => {
    for (const status of ['prospect', 'active', 'inactive', 'loyal'] as const) {
      expect(clientToFollowUp(ctx({ clients: [client({ status })] }))).toHaveLength(0);
    }
  });

  it('ne se déclenche pas pour un client archivé, même à relancer', () => {
    const result = clientToFollowUp(ctx({ clients: [client({ status: 'to_follow_up', archivedAt: TODAY })] }));
    expect(result).toHaveLength(0);
  });
});

describe('clientNoRecentContact', () => {
  it('se déclenche au-delà du seuil configuré', () => {
    const lastContact = new Date(TODAY.getTime() - 31 * 86_400_000);
    const result = clientNoRecentContact(ctx({ clients: [client({ lastContactAt: lastContact })], clientFollowUpDays: 30 }));
    expect(result).toHaveLength(1);
  });

  it('ne se déclenche pas juste sous le seuil (limite)', () => {
    const lastContact = new Date(TODAY.getTime() - 29 * 86_400_000);
    const result = clientNoRecentContact(ctx({ clients: [client({ lastContactAt: lastContact })], clientFollowUpDays: 30 }));
    expect(result).toHaveLength(0);
  });

  it('se déclenche pile au seuil (limite inclusive)', () => {
    const lastContact = new Date(TODAY.getTime() - 30 * 86_400_000);
    const result = clientNoRecentContact(ctx({ clients: [client({ lastContactAt: lastContact })], clientFollowUpDays: 30 }));
    expect(result).toHaveLength(1);
  });

  it('se déclenche pour un client sans aucune date de contact connue', () => {
    const result = clientNoRecentContact(ctx({ clients: [client({ lastContactAt: null })] }));
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toContain('jamais contacté');
  });

  it("ne se déclenche pas pour un client 'to_follow_up' ou 'inactive' (couverts par d'autres règles/hors périmètre)", () => {
    expect(clientNoRecentContact(ctx({ clients: [client({ status: 'to_follow_up', lastContactAt: null })] }))).toHaveLength(0);
    expect(clientNoRecentContact(ctx({ clients: [client({ status: 'inactive', lastContactAt: null })] }))).toHaveLength(0);
  });

  it('ne se déclenche pas pour un client archivé', () => {
    expect(
      clientNoRecentContact(ctx({ clients: [client({ lastContactAt: null, archivedAt: TODAY })] })),
    ).toHaveLength(0);
  });
});

describe('compute() — orchestration', () => {
  it('répartit les insights par type et trie par priorité', () => {
    const result = compute(
      ctx({
        clients: [client({ id: 'c1', status: 'to_follow_up' })],
        tasks: [
          task({ id: 't1', dueDate: new Date(TODAY.getTime() - 86_400_000) }), // en retard -> alert
          task({ id: 't2', dueDate: TODAY }), // aujourd'hui -> priority
        ],
      }),
    );
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]!.type).toBe('alert');
    expect(result.priorities.map((i) => i.type)).toEqual(['priority', 'priority']);
    expect(result.opportunities).toHaveLength(0);
  });

  it('sans données -> aucun insight nulle part', () => {
    const result = compute({ today: TODAY });
    expect(result.alerts).toHaveLength(0);
    expect(result.priorities).toHaveLength(0);
    expect(result.opportunities).toHaveLength(0);
  });

  it('utilise todayInTimezone() par défaut si aucune date de référence fournie', () => {
    const result = compute({});
    // Pas d'assertion sur le contenu (dépend du jour réel) — seulement que ça
    // ne lève pas et respecte la forme attendue.
    expect(result).toHaveProperty('alerts');
    expect(result).toHaveProperty('priorities');
    expect(result).toHaveProperty('opportunities');
  });
});

describe('todayInTimezone / daysBetween (convention Europe/Paris)', () => {
  it('produit une date à minuit UTC (comparable à un champ @db.Date)', () => {
    const t = todayInTimezone('Europe/Paris', new Date('2026-06-15T22:30:00Z'));
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
  });

  it("reste sur le même jour civil qu'un 'new Date()' naïf ne donnerait pas forcément près de minuit UTC", () => {
    // 23h30 UTC = 1h30 (ou 0h30) le lendemain à Paris selon la saison : une
    // comparaison UTC naïve resterait sur l'ancien jour. todayInTimezone
    // doit refléter le jour civil parisien.
    const winter = todayInTimezone('Europe/Paris', new Date('2026-01-10T23:30:00Z')); // Paris = 11 jan 00:30 (UTC+1)
    expect(winter.toISOString().slice(0, 10)).toBe('2026-01-11');
  });

  it('daysBetween est positif quand "to" est après "from"', () => {
    expect(daysBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-05T00:00:00Z'))).toBe(4);
  });
});
