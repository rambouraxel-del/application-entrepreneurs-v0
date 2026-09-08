import { appDb, tenantExtension } from './client';
import type { TenantContext } from '../tenant/context';

/**
 * Point d'accès UNIQUE aux données métier scopées tenant.
 *
 * Aucun service ne doit importer `appDb` directement : tout passe par ici.
 * Ouvre une transaction, y pose le contexte tenant pour PostgreSQL, puis
 * fournit un client Prisma déjà scopé sur l'organisation — deux protections
 * superposées et volontairement redondantes (extension + RLS, voir
 * docs/v1/lot-0-validation.md §3).
 */
function scopedClient(organizationId: string) {
  return appDb.$extends(tenantExtension(organizationId));
}

export type TenantScopedClient = Omit<
  ReturnType<typeof scopedClient>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: TenantScopedClient) => Promise<T>,
): Promise<T> {
  return scopedClient(ctx.organizationId).$transaction(
    async (tx) => {
      // set_config(..., is_local => true) : portée TRANSACTION, jamais SET de
      // portée session (qui fuiterait entre requêtes via un pool recyclé).
      await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`;
      return fn(tx as unknown as TenantScopedClient);
    },
    { timeout: 20_000, maxWait: 20_000 },
  );
}

/**
 * Transaction authentifiée SANS organisation courante : sert uniquement à
 * résoudre les appartenances d'un utilisateur, avant que l'organisation soit
 * connue. `app.organization_id` reste absent.
 */
export async function withUserOnly<T>(
  userId: string,
  fn: (tx: Parameters<Parameters<typeof appDb.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return appDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
