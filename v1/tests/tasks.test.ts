import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { withTenant } from '@/lib/db/withTenant';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as tasks from '@/modules/tasks/service';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * CRUD Task + isolation multi-tenant (docs/v1/lot-2-clients-dashboard.md
 * §Multi-tenancy, §Tasks). Le point critique du Lot 2 : A ne doit jamais
 * pouvoir créer une tâche liée au Client de B, même en connaissant son id.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('CRUD', () => {
  it('crée une tâche sans client lié', async () => {
    const created = await tasks.createTask(ctxA(), { title: 'Nouvelle tâche' });
    expect(created.organizationId).toBe(f.orgA);
    expect(created.clientId).toBeNull();
  });

  it('crée une tâche liée à un client de la même organisation', async () => {
    const created = await tasks.createTask(ctxA(), { title: 'Relancer', clientId: f.clientA });
    expect(created.clientId).toBe(f.clientA);
  });

  it('rejette un titre vide', async () => {
    await expect(tasks.createTask(ctxA(), { title: '  ' })).rejects.toThrow();
  });

  it('rejette une priorité invalide', async () => {
    await expect(tasks.createTask(ctxA(), { title: 'X', priority: 'urgent' })).rejects.toThrow();
  });

  it('rejette une date invalide', async () => {
    await expect(tasks.createTask(ctxA(), { title: 'X', dueDate: 'pas-une-date' })).rejects.toThrow();
  });

  it('termine puis réouvre une tâche', async () => {
    const done = await tasks.completeTask(ctxA(), f.taskA);
    expect(done.completedAt).not.toBeNull();
    const reopened = await tasks.reopenTask(ctxA(), f.taskA);
    expect(reopened.completedAt).toBeNull();
  });

  it('supprime une tâche', async () => {
    await tasks.deleteTask(ctxA(), f.taskA);
    const remaining = await withTenant(ctxA(), (db) => db.task.findMany());
    expect(remaining).toHaveLength(0);
  });
});

describe('Isolation multi-tenant', () => {
  it('A ne voit pas les tâches de B', async () => {
    const rows = await tasks.listTasks(ctxA(), { includeCompleted: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(f.taskA);
  });

  it('A ne peut pas lire la tâche de B par son identifiant', async () => {
    const row = await tasks.getTask(ctxA(), f.taskB);
    expect(row).toBeNull();
  });

  it('A ne peut pas terminer la tâche de B', async () => {
    await expect(tasks.completeTask(ctxA(), f.taskB)).rejects.toThrow();
    const untouched = await systemDb.task.findUnique({ where: { id: f.taskB } });
    expect(untouched!.completedAt).toBeNull();
  });

  it('A ne peut pas supprimer la tâche de B', async () => {
    await expect(tasks.deleteTask(ctxA(), f.taskB)).rejects.toThrow();
    expect(await systemDb.task.findUnique({ where: { id: f.taskB } })).not.toBeNull();
  });

  it("la RLS refuse une insertion brute de tâche visant l'organisation de B", async () => {
    await expect(
      withTenant(ctxA(), (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO tasks (id, organization_id, title, priority, created_at, updated_at)
           VALUES (gen_random_uuid(), '${f.orgB}', 'Injecté SQL', 'normal', now(), now())`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('point critique : A ne peut PAS créer une tâche liée au Client de B', async () => {
    await expect(tasks.createTask(ctxA(), { title: 'Relancer B', clientId: f.clientB })).rejects.toThrow();
    // Aucune tâche n'a été créée malgré l'échec.
    const rows = await withTenant(ctxA(), (db) => db.task.findMany({ where: { title: 'Relancer B' } }));
    expect(rows).toHaveLength(0);
  });

  it("A ne peut pas non plus RÉ-ASSIGNER une tâche existante au Client de B", async () => {
    await expect(
      tasks.updateTask(ctxA(), f.taskA, { title: 'Tâche A', clientId: f.clientB }),
    ).rejects.toThrow();
  });
});
