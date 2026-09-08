import { PrismaClient, Prisma } from '../../generated/prisma/index.js';
import { TenantScopeViolationError } from '../tenant/context.js';

/**
 * Deux clients, deux rôles PostgreSQL distincts.
 *
 * - `appPrisma`  : rôle applicatif (spike_app). Non superuser, non
 *   propriétaire, sans BYPASSRLS → la RLS s'applique. C'est le seul client
 *   qu'un module métier a le droit d'utiliser.
 * - `systemPrisma` : rôle SYSTÈME (BYPASSRLS). Réservé aux chemins qui ne
 *   peuvent PAS avoir de contexte tenant — inscription (l'organisation n'existe
 *   pas encore), webhooks de paiement, jeux de test. En V1 il vit dans
 *   `lib/db/system.ts`, son importation est surveillée par une règle de lint
 *   (architecture §6.1). C'est la seule porte de sortie de la RLS.
 */
const appUrl = process.env.DATABASE_URL_APP;
const systemUrl = process.env.DATABASE_URL_SYSTEM;
if (!appUrl || !systemUrl) {
  throw new Error('DATABASE_URL_APP et DATABASE_URL_SYSTEM sont requis (voir .env.example).');
}

export const appPrisma = new PrismaClient({ datasourceUrl: appUrl });
export const systemPrisma = new PrismaClient({ datasourceUrl: systemUrl });

/** Modèles porteurs d'un organization_id : ceux que l'extension doit scoper. */
export const TENANT_SCOPED_MODELS = new Set(['Client', 'IssuedDocument', 'DocumentCounter']);

/**
 * Extension d'injection automatique du tenant.
 *
 * Objectif : réduire le risque qu'un développeur oublie `where: { organizationId }`.
 * Ce n'est PAS une garantie de sécurité — ses limites sont documentées dans
 * docs/v1/lot-0-validation.md et c'est précisément pour elles que la RLS existe.
 */
export function tenantExtension(organizationId: string) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) return query(args as never);

          const a = args as Record<string, unknown>;

          // Un organizationId explicite et divergent est un bug : on refuse.
          const assertScope = (candidate: unknown) => {
            const given = (candidate as { organizationId?: unknown } | undefined)?.organizationId;
            if (typeof given === 'string' && given !== organizationId) {
              throw new TenantScopeViolationError(organizationId, given);
            }
          };

          switch (operation) {
            // Lectures et écritures de masse : filtre ajouté au where.
            case 'findMany':
            case 'findFirst':
            case 'findFirstOrThrow':
            case 'updateMany':
            case 'deleteMany':
            case 'count':
            case 'aggregate':
            // Opérations ciblées : Prisma >= 5 accepte des filtres non uniques
            // dans le where dès qu'un champ unique est présent
            // (« extendedWhereUnique »), ce qui permet de les scoper aussi.
            case 'findUnique':
            case 'findUniqueOrThrow':
            case 'update':
            case 'delete':
              assertScope(a.where);
              a.where = { ...(a.where as object | undefined), organizationId };
              break;

            // Créations : le tenant est imposé, il ne vient jamais de l'appelant.
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

            // upsert : where + create scopés.
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
