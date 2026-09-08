import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { taskInputSchema, type TaskInput } from './validation';
import { assertClientBelongsToOrg } from '@/modules/clients/service';
import * as repo from './repository';
import type { TaskListFilter } from './repository';

/**
 * Service métier Task (docs/v1/lot-2-clients-dashboard.md §Tasks). Pas de
 * sous-tâches, pas de projets, pas de récurrence, pas de collaboration.
 *
 * Point de sécurité explicite : `clientId` est fourni par l'utilisateur (un
 * <select> côté formulaire), donc jamais fiable en tant que tel — même
 * scopé par la RLS en lecture, un `clientId` d'une AUTRE organisation
 * passerait la contrainte FK (elle ne connaît pas le tenant) si on ne le
 * vérifiait pas explicitement. `assertClientBelongsToOrg` fait cette
 * vérification via une requête scopée tenant AVANT toute écriture : A ne
 * peut donc jamais lier une tâche au client de B (voir tests/tasks.test.ts).
 */

async function parseInput(ctx: TenantContext, raw: unknown): Promise<TaskInput> {
  const input = taskInputSchema.parse(raw);
  if (input.clientId) await assertClientBelongsToOrg(ctx, input.clientId);
  return input;
}

export async function createTask(ctx: TenantContext, raw: unknown) {
  const input = await parseInput(ctx, raw);
  return withTenant(ctx, (db) => repo.createTask(db, input));
}

export async function listTasks(ctx: TenantContext, filter: TaskListFilter = {}) {
  return withTenant(ctx, (db) => repo.listTasks(db, filter));
}

export async function getTask(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.getTask(db, id));
}

export async function updateTask(ctx: TenantContext, id: string, raw: unknown) {
  const input = await parseInput(ctx, raw);
  return withTenant(ctx, (db) => repo.updateTask(db, id, input));
}

export async function completeTask(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setTaskCompleted(db, id, true));
}

export async function reopenTask(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setTaskCompleted(db, id, false));
}

export async function deleteTask(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.deleteTask(db, id));
}
