import type { TenantScopedClient } from '@/lib/db/withTenant';
import type { TaskInput } from './validation';

/** Accès aux données Task — déjà scopées tenant par `withTenant` (extension + RLS). */
export function createTask(db: TenantScopedClient, input: TaskInput) {
  return db.task.create({ data: input as never });
}

export type TaskListFilter = {
  includeCompleted?: boolean;
  clientId?: string;
};

export function listTasks(db: TenantScopedClient, filter: TaskListFilter = {}) {
  return db.task.findMany({
    where: {
      completedAt: filter.includeCompleted ? undefined : null,
      clientId: filter.clientId,
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export function getTask(db: TenantScopedClient, id: string) {
  return db.task.findUnique({ where: { id } });
}

export function updateTask(db: TenantScopedClient, id: string, input: TaskInput) {
  return db.task.update({ where: { id }, data: input as never });
}

export function setTaskCompleted(db: TenantScopedClient, id: string, completed: boolean) {
  return db.task.update({ where: { id }, data: { completedAt: completed ? new Date() : null } });
}

export function deleteTask(db: TenantScopedClient, id: string) {
  return db.task.delete({ where: { id } });
}

/** Requêtes brutes pour le Dashboard — voir modules/dashboard/service.ts. */
export function tasksDueBetween(db: TenantScopedClient, from: Date, to: Date) {
  return db.task.findMany({
    where: { completedAt: null, dueDate: { gte: from, lt: to } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
  });
}

export function tasksOverdue(db: TenantScopedClient, before: Date) {
  return db.task.findMany({
    where: { completedAt: null, dueDate: { lt: before } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
  });
}
