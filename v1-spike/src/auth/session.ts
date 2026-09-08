import { withUserOnly } from '../db/withTenant.js';
import { ForbiddenOrganizationError, verifiedTenantContext, type TenantContext } from '../tenant/context.js';

/**
 * Session applicative.
 *
 * ⚠️ SPIKE : l'authentification réelle (Supabase Auth) n'est PAS exécutée ici —
 * elle exige un projet Supabase et des identifiants indisponibles hors ligne.
 * Ce module simule uniquement l'ÉTAPE AMONT (« voici l'utilisateur connecté »)
 * et teste réellement tout ce qui suit : résolution des appartenances,
 * autorisation de l'organisation, construction du contexte serveur.
 *
 * En V1, `getSession()` lit la session du fournisseur d'auth ; le reste du
 * fichier est inchangé. Voir docs/v1/lot-0-validation.md §Auth.
 */
export type Session = { userId: string };

/** Substitut de session pour le spike. En V1 : lecture de la session Supabase. */
export function fakeSession(userId: string): Session {
  return { userId };
}

/**
 * Construit le contexte tenant à partir de la session et d'une organisation
 * DEMANDÉE (par exemple mémorisée dans la session ou choisie par l'utilisateur).
 *
 * C'est ici que se joue la règle : une organisation demandée n'est acceptée que
 * si une appartenance existe. Un `organizationId` fabriqué par le navigateur
 * est donc rejeté avant d'atteindre la moindre requête métier.
 */
export async function resolveTenantContext(
  session: Session,
  requestedOrganizationId: string,
): Promise<TenantContext> {
  const membership = await withUserOnly(session.userId, (tx) =>
    tx.membership.findFirst({
      where: { userId: session.userId, organizationId: requestedOrganizationId },
      select: { organizationId: true },
    }),
  );

  if (!membership) {
    throw new ForbiddenOrganizationError(session.userId, requestedOrganizationId);
  }

  return verifiedTenantContext(session.userId, membership.organizationId);
}

/** Organisations auxquelles l'utilisateur a réellement accès. */
export async function listMemberships(session: Session): Promise<string[]> {
  const rows = await withUserOnly(session.userId, (tx) =>
    tx.membership.findMany({ select: { organizationId: true } }),
  );
  return rows.map((r) => r.organizationId);
}
