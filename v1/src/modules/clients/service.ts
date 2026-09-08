import { withTenant } from '@/lib/db/withTenant';
import type { TenantContext } from '@/lib/tenant/context';
import { clientInputSchema, type ClientInput } from './validation';
import * as repo from './repository';

/**
 * Service métier Client — premier module métier réel du Lot 1. Volontairement
 * minimal (docs/mvp-commercial.md) : pas de CRM avancé, pas d'historique, pas
 * de documents liés. L'objectif est de prouver auth + tenant + DB + CRUD sur
 * une première donnée, pas de construire le module final.
 *
 * Décision Lot 1 : SUPPRESSION = ARCHIVAGE (statut `archived`), jamais de
 * suppression physique. C'est la solution la plus simple et la plus
 * réversible (principe retenu en l'absence de test utilisateur, voir
 * docs/mvp-commercial.md) — et cela évite dès maintenant le problème d'un
 * client réellement supprimé alors que des devis/factures y feront référence
 * dans un lot ultérieur.
 */

export type ClientFormInput = {
  kind?: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
};

function parseInput(raw: unknown): ClientInput {
  return clientInputSchema.parse(raw);
}

export async function createClient(ctx: TenantContext, raw: unknown) {
  const input = parseInput(raw);
  return withTenant(ctx, (db) => repo.createClient(db, input));
}

export async function listClients(ctx: TenantContext) {
  return withTenant(ctx, (db) => repo.listClients(db));
}

export async function getClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.getClient(db, id));
}

export async function updateClient(ctx: TenantContext, id: string, raw: unknown) {
  const input = parseInput(raw);
  return withTenant(ctx, (db) => repo.updateClient(db, id, input));
}

export async function archiveClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setClientStatus(db, id, 'archived'));
}

export async function restoreClient(ctx: TenantContext, id: string) {
  return withTenant(ctx, (db) => repo.setClientStatus(db, id, 'active'));
}
