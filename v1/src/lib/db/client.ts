import { PrismaClient, Prisma } from '../../../generated/prisma/index';
import { TenantScopeViolationError } from '../tenant/context';

/**
 * Deux clients, deux rôles PostgreSQL distincts (docs/v1/lot-0-validation.md §8.3).
 *
 * - `appDb`    : rôle applicatif (cockpit_app). Non superuser, non propriétaire,
 *   NOBYPASSRLS → la RLS s'applique. C'est le SEUL client qu'un module métier
 *   a le droit d'utiliser (via withTenant, jamais directement).
 * - `systemDb` : rôle système (cockpit_system, BYPASSRLS). Réservé aux chemins
 *   qui ne peuvent PAS avoir de contexte tenant — inscription (l'organisation
 *   n'existe pas encore), seed. Importé UNIQUEMENT depuis system.ts.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquante — voir .env.example`);
  return value;
}

export const appDb = new PrismaClient({ datasourceUrl: requireEnv('DATABASE_URL_APP') });

/** Modèles porteurs d'un organizationId : ceux que l'extension doit scoper. */
const TENANT_SCOPED_MODELS = new Set([
  'Client', 'Task', 'Quote', 'QuoteLine', 'DocumentCounter', 'Invoice', 'InvoiceLine', 'Payment',
]);

/**
 * Extension d'injection automatique du tenant.
 *
 * Réduit le risque d'oubli de `where: { organizationId }`. Ce n'est PAS une
 * garantie de sécurité — ses limites (SQL brut, relations imbriquées, modèles
 * hors périmètre) sont documentées dans docs/v1/lot-1-socle.md et c'est
 * précisément pour elles que la RLS existe en dessous.
 */
export function tenantExtension(organizationId: string) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args as never);

          const a = args as Record<string, unknown>;
          const assertScope = (candidate: unknown) => {
            const given = (candidate as { organizationId?: unknown } | undefined)?.organizationId;
            if (typeof given === 'string' && given !== organizationId) {
              throw new TenantScopeViolationError(organizationId, given);
            }
          };

          switch (operation) {
            case 'findMany':
            case 'findFirst':
            case 'findFirstOrThrow':
            case 'updateMany':
            case 'deleteMany':
            case 'count':
            case 'aggregate':
            case 'findUnique':
            case 'findUniqueOrThrow':
              a.where = { ...(a.where as object | undefined), organizationId };
              break;
            case 'update':
            case 'delete':
              assertScope(a.where);
              a.where = { ...(a.where as object | undefined), organizationId };
              break;
            case 'create':
              assertScope(a.data);
              a.data = { ...(a.data as object | undefined), organizationId };
              break;
            case 'createMany':
            case 'createManyAndReturn': {
              const data = a.data;
              (Array.isArray(data) ? data : [data]).forEach(assertScope);
              a.data = Array.isArray(data)
                ? data.map((row) => ({ ...(row as object), organizationId }))
                : { ...(data as object), organizationId };
              break;
            }
            case 'upsert':
              assertScope(a.where);
              assertScope(a.create);
              a.where = { ...(a.where as object | undefined), organizationId };
              a.create = { ...(a.create as object | undefined), organizationId };
              break;
          }

          return query(a as never);
        },
      },
    },
  });
}
