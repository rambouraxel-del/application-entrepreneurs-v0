import { appPrisma, tenantExtension } from './client.js';
import type { TenantContext } from '../tenant/context.js';

/**
 * Point d'accès UNIQUE aux données métier.
 *
 * Ouvre une transaction, y pose le contexte tenant pour PostgreSQL, puis
 * fournit un client Prisma déjà scopé sur l'organisation.
 *
 * Deux protections superposées, volontairement redondantes :
 *   1. `set_config(..., is_local => true)` → la RLS PostgreSQL filtre au niveau
 *      de la base. Portée TRANSACTION : la valeur est annulée au COMMIT comme
 *      au ROLLBACK, elle ne peut donc pas fuiter vers la requête suivante d'un
 *      autre tenant via une connexion recyclée par le pool.
 *   2. L'extension Prisma injecte `organizationId` dans les requêtes → un
 *      oubli de filtre ne renvoie pas la donnée d'un autre tenant.
 *
 * `$executeRaw` en littéral balisé → requête paramétrée. On n'utilise pas
 * « SET LOCAL app.organization_id = ... » car SET n'accepte pas de paramètre
 * lié : il faudrait concaténer la valeur, donc ouvrir une injection SQL.
 */
function scopedClient(organizationId: string) {
  return appPrisma.$extends(tenantExtension(organizationId));
}

/** Client Prisma scopé tenant, tel qu'exposé à un service métier. */
export type TenantScopedClient = Omit<
  ReturnType<typeof scopedClient>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

export type TransactionOptions = { timeout?: number; maxWait?: number };

export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: TenantScopedClient) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  return scopedClient(ctx.organizationId).$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`;
      return fn(tx as unknown as TenantScopedClient);
    },
    { timeout: options.timeout ?? 20_000, maxWait: options.maxWait ?? 20_000 },
  );
}

/**
 * Transaction authentifiée SANS organisation courante : sert uniquement à
 * résoudre les appartenances d'un utilisateur, avant que l'organisation soit
 * connue. `app.organization_id` reste absent → les tables métier sont
 * invisibles (comportement « fail closed » vérifié par les tests).
 */
export async function withUserOnly<T>(
  userId: string,
  fn: (tx: Parameters<Parameters<typeof appPrisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return appPrisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
