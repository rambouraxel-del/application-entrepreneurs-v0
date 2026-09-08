import { systemDb } from '@/lib/db/system';
import { withUserOnly, withTenant } from '@/lib/db/withTenant';
import { ForbiddenOrganizationError, verifiedTenantContext, type TenantContext } from '@/lib/tenant/context';
import type { Session } from '@/modules/auth/session';

/**
 * Les identifiants (organisation, utilisateur) sont des UUID PostgreSQL
 * (`@db.Uuid`). Une valeur mal formée déclenche sinon une erreur SQL brute au
 * lieu d'un simple "non trouvé" — on la traite ici comme une non-appartenance.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Résout le contexte tenant à partir de la session et d'une organisation
 * DEMANDÉE. C'est ici, et seulement ici, que se joue la règle centrale :
 * une organisation n'est acceptée que si une appartenance existe. Un
 * organizationId fabriqué par le navigateur est rejeté avant d'atteindre la
 * moindre requête métier (docs/v1/architecture.md §6).
 */
export async function resolveTenantContext(
  session: Session,
  requestedOrganizationId: string,
): Promise<TenantContext> {
  if (!UUID_RE.test(requestedOrganizationId)) {
    throw new ForbiddenOrganizationError(session.userId, requestedOrganizationId);
  }
  const membership = await withUserOnly(session.userId, (tx) =>
    tx.membership.findFirst({
      where: { userId: session.userId, organizationId: requestedOrganizationId },
      select: { organizationId: true },
    }),
  );
  if (!membership) throw new ForbiddenOrganizationError(session.userId, requestedOrganizationId);
  return verifiedTenantContext(session.userId, membership.organizationId);
}

/** Organisations auxquelles l'utilisateur a réellement accès. */
export async function listMemberships(session: Session) {
  if (!UUID_RE.test(session.userId)) return [];
  return withUserOnly(session.userId, (tx) =>
    tx.membership.findMany({
      where: { userId: session.userId },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  );
}

/**
 * Résout le contexte tenant "par défaut" d'une session : la première
 * organisation dont l'utilisateur est membre. Suffisant pour le Lot 1 (un
 * utilisateur = une organisation) ; le modèle (Membership) permet déjà
 * plusieurs organisations pour un futur sélecteur (docs/mvp-commercial.md,
 * multi-utilisateur P1 — pas construit ici).
 */
export async function resolveDefaultTenantContext(session: Session): Promise<TenantContext | null> {
  const memberships = await listMemberships(session);
  const first = memberships[0];
  if (!first) return null;
  return verifiedTenantContext(session.userId, first.organizationId);
}

/**
 * Crée une organisation ET le premier membership, pour un utilisateur qui
 * vient de s'inscrire.
 *
 * Utilise le rôle SYSTÈME (BYPASSRLS) — seul cas légitime documenté : au
 * moment de l'inscription, l'organisation n'existe pas encore, donc aucun
 * contexte tenant ne peut être posé (découverte du Lot 0 §8.3). Les deux
 * écritures sont dans une même transaction : jamais d'organisation orpheline
 * sans membership.
 */
export async function createOrganizationForNewUser(session: Session, name: string) {
  return systemDb.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name } });
    await tx.membership.create({
      data: { userId: session.userId, organizationId: organization.id, role: 'owner' },
    });
    return organization;
  });
}

/** Renomme l'organisation courante (opération soumise à la RLS normale). */
export async function renameOrganization(ctx: TenantContext, name: string) {
  return withTenant(ctx, (db) => db.organization.update({ where: { id: ctx.organizationId }, data: { name } }));
}

export async function getOrganization(ctx: TenantContext) {
  return withTenant(ctx, (db) => db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } }));
}

/**
 * Réglage minimal exposé dans Settings (Lot 2) : le seuil de relance utilisé
 * par la règle d'insight "sans contact récent" (modules/insights/rules.ts).
 * Volontairement un seul champ — pas de page Settings étendue.
 */
export async function updateClientFollowUpDays(ctx: TenantContext, days: number) {
  return withTenant(ctx, (db) =>
    db.organization.update({ where: { id: ctx.organizationId }, data: { clientFollowUpDays: days } }),
  );
}
