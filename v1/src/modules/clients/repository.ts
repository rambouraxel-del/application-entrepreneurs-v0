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

export type ClientListFilter = {
  /** Recherche libre sur nom/entreprise/e-mail — insensible à la casse. */
  search?: string;
  status?: ClientStatus;
  /** Par défaut, les clients archivés sont exclus des listes. */
  includeArchived?: boolean;
};

export function listClients(db: TenantScopedClient, filter: ClientListFilter = {}) {
  return db.client.findMany({
    where: {
      archivedAt: filter.includeArchived ? undefined : null,
      status: filter.status,
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { companyName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function getClient(db: TenantScopedClient, id: string) {
  return db.client.findUnique({ where: { id } });
}

export function updateClient(db: TenantScopedClient, id: string, input: ClientInput) {
  return db.client.update({ where: { id }, data: input as never });
}

export function setClientArchived(db: TenantScopedClient, id: string, archived: boolean) {
  return db.client.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
}

/** Existence + appartenance à l'organisation courante — utilisé par tasks/service.ts. */
export function clientExists(db: TenantScopedClient, id: string) {
  return db.client.findUnique({ where: { id }, select: { id: true } });
}
