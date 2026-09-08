'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import * as taskService from './service';
import { taskFormShouldNotContainOrganizationId } from './validation';

export type FormState = { error: string | null };

function readTaskForm(formData: FormData) {
  taskFormShouldNotContainOrganizationId(formData);
  return {
    title: formData.get('title'),
    clientId: formData.get('clientId') ?? undefined,
    dueDate: formData.get('dueDate') ?? undefined,
    priority: formData.get('priority') ?? 'normal',
  };
}

function firstZodMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Formulaire invalide';
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}

function revalidateAfterTaskChange(clientId?: string | null) {
  revalidatePath('/app');
  revalidatePath('/app/tasks');
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
}

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  const input = readTaskForm(formData);
  try {
    const created = await taskService.createTask(ctx, input);
    revalidateAfterTaskChange(created.clientId);
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  redirect('/app/tasks');
}

export async function completeTaskAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const task = await taskService.completeTask(ctx, id);
  revalidateAfterTaskChange(task.clientId);
}

export async function reopenTaskAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const task = await taskService.reopenTask(ctx, id);
  revalidateAfterTaskChange(task.clientId);
}

export async function deleteTaskAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const task = await taskService.deleteTask(ctx, id);
  revalidateAfterTaskChange(task.clientId);
}
