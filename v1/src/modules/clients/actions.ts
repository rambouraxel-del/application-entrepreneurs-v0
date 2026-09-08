'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import * as clientService from './service';
import { clientFormShouldNotContainOrganizationId } from './validation';
import { ZodError } from 'zod';

/**
 * Chaque Server Action suit exactement la séquence de docs/v1/architecture.md
 * §5 : authentifier -> résoudre le contexte tenant -> valider -> service.
 * Toute la logique métier vit dans clients/service.ts ; ce fichier ne fait
 * qu'orchestrer et traduire les erreurs pour l'UI.
 */

export type FormState = { error: string | null };

function readClientForm(formData: FormData) {
  clientFormShouldNotContainOrganizationId(formData); // organizationId ne vient JAMAIS du navigateur
  return {
    kind: formData.get('kind') ?? 'individual',
    name: formData.get('name'),
    companyName: formData.get('companyName') ?? undefined,
    email: formData.get('email') ?? undefined,
    phone: formData.get('phone') ?? undefined,
    status: formData.get('status') ?? 'prospect',
    notes: formData.get('notes') ?? undefined,
    lastContactAt: formData.get('lastContactAt') ?? undefined,
  };
}

function firstZodMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Formulaire invalide';
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue.';
}

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await clientService.createClient(ctx, readClientForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidatePath('/app/clients');
  redirect('/app/clients');
}

export async function updateClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireTenantContext();
  try {
    await clientService.updateClient(ctx, id, readClientForm(formData));
  } catch (error) {
    return { error: firstZodMessage(error) };
  }
  revalidatePath('/app/clients');
  revalidatePath(`/app/clients/${id}`);
  redirect(`/app/clients/${id}`);
}

export async function archiveClientAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await clientService.archiveClient(ctx, id);
  revalidatePath('/app/clients');
  revalidatePath(`/app/clients/${id}`);
}

export async function restoreClientAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  await clientService.restoreClient(ctx, id);
  revalidatePath('/app/clients');
  revalidatePath(`/app/clients/${id}`);
}

/** Raccourci "Marquer comme contacté aujourd'hui" — utilisé au Dashboard et sur la fiche. */
export async function markContactedTodayAction(id: string): Promise<void> {
  const ctx = await requireTenantContext();
  const client = await clientService.getClient(ctx, id);
  if (!client) throw new Error('Client introuvable.');
  await clientService.updateClient(ctx, id, {
    kind: client.kind,
    name: client.name,
    companyName: client.companyName ?? undefined,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    status: client.status,
    notes: client.notes ?? undefined,
    lastContactAt: new Date().toISOString().slice(0, 10),
  });
  revalidatePath('/app/clients');
  revalidatePath(`/app/clients/${id}`);
  revalidatePath('/app');
}
