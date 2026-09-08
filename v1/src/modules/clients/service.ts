import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { clientInputSchema, type ClientInput } from './validation';
import * as repo from './repository';
import type { ClientListFilter } from './repository';

/**
 * Service métier Client. Volontairement minimal (docs/mvp-commercial.md) :
 * pas de CRM avancé, pas d'historique typé, pas de documents liés. Étendu au
 * Lot 2 avec le strict nécessaire au Dashboard (statut CRM, dernier contact,
 * notes courtes) — voir docs/v1/lot-2-clients-dashboard.md.
 *
 * Décision Lot 1 (inchangée) : SUPPRESSION = ARCHIVAGE, jamais de suppression
 * physique. Au Lot 2, l'archivage devient un champ séparé du statut CRM
 * (`archivedAt`) : un client peut être "fidèle" et archivé (ancien client
 * qu'on ne veut plus voir dans les listes actives, mais pas "supprimé").
 */

function parseInput(raw: unknown): ClientInput {
  return clientInputSchema.parse(raw);
}

export async function createClient(ctx: TenantContext, raw: unknown) {
  const input = parseInput(raw);
  return withTenant(ctx, (db) => repo.createClient(db, input));
}

export async function listClients(ctx: TenantContext, filter: ClientListFilter = {}) {
  return withTenant(ctx, (db) => repo.listClients(db, filter));
}

export async function getClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.getClient(db, id));
}

export async function updateClient(ctx: TenantContext, id: string, raw: unknown) {
  const input = parseInput(raw);
  return withTenant(ctx, (db) => repo.updateClient(db, id, input));
}

export async function archiveClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setClientArchived(db, id, true));
}

export async function restoreClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setClientArchived(db, id, false));
}

/**
 * Vérifie qu'un client appartient bien à l'organisation courante. Utilisé
 * par tasks/service.ts avant de lier une tâche : la RLS empêcherait de toute
 * façon une lecture cross-tenant, mais le contrôle explicite ici produit une
 * erreur métier claire plutôt qu'un `null` silencieux (docs/v1/lot-2-clients-dashboard.md
 * §Multi-tenancy — "A ne doit jamais pouvoir créer une tâche liée au Client de B").
 */
export async function assertClientBelongsToOrg(ctx: TenantContext, clientId: string): Promise<void> {
  const found = await withTenant(ctx, (db) => repo.clientExists(db, clientId));
  if (!found) throw new Error('Client introuvable dans cette organisation.');
}
