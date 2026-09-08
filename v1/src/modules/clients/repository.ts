import type { TenantScopedClient } from '@/lib/db/withTenant';
import type { ClientInput } from './validation';
import type { ClientStatus } from '../../../generated/prisma/index';

/**
 * Accès aux données — aucune règle métier ici, uniquement des requêtes déjà
 * scopées tenant par `withTenant` (extension + RLS). Un service ne doit
 * jamais importer Prisma directement : il passe par ce repository.
 */
export function createClient(db: TenantScopedClient, input: ClientInput) {
  return db.client.create({ data: input as never });
}

export function listClients(db: TenantScopedClient) {
  return db.client.findMany({ orderBy: { createdAt: 'desc' } });
}

export function getClient(db: TenantScopedClient, id: string) {
  return db.client.findUnique({ where: { id } });
}

export function updateClient(db: TenantScopedClient, id: string, input: ClientInput) {
  return db.client.update({ where: { id }, data: input as never });
}

export function setClientStatus(db: TenantScopedClient, id: string, status: ClientStatus) {
  return db.client.update({ where: { id }, data: { status } });
}
