'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/modules/auth/session';
import { resolveDefaultTenantContext } from '@/modules/organizations/service';
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

async function requireTenantContext() {
  const session = await requireSession();
  const ctx = await resolveDefaultTenantContext(session);
  if (!ctx) redirect('/app/onboarding');
  return ctx;
}

function readClientForm(formData: FormData) {
  clientFormShouldNotContainOrganizationId(formData); // organizationId ne vient JAMAIS du navigateur
  return {
    kind: formData.get('kind') ?? 'individual',
    name: formData.get('name'),
    companyName: formData.get('companyName') ?? undefined,
    email: formData.get('email') ?? undefined,
    phone: formData.get('phone') ?? undefined,
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
