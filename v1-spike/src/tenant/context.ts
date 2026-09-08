/**
 * Contexte tenant — la seule source autorisée d'un organizationId.
 *
 * Règle d'architecture (docs/v1/architecture.md §6) : l'organizationId n'est
 * JAMAIS lu depuis une entrée navigateur (URL, formulaire, en-tête). Il est
 * toujours dérivé côté serveur de la session, puis vérifié contre les
 * appartenances de l'utilisateur.
 */
declare const verified: unique symbol;

export type TenantContext = {
  readonly userId: string;
  readonly organizationId: string;
  /** Marque de type : seul `resolveTenantContext()` peut en produire un. */
  readonly [verified]: true;
};

/**
 * Producteur unique et légitime — appelé par resolveTenantContext() APRÈS
 * vérification de l'appartenance.
 */
export function verifiedTenantContext(userId: string, organizationId: string): TenantContext {
  return { userId, organizationId } as TenantContext;
}

/**
 * Réservé aux tests. Le nom est volontairement dissuasif : produire un contexte
 * sans vérifier l'appartenance est précisément la faille que le Lot 0 a mise en
 * évidence. En production, la RLS refuse désormais un tel contexte (policy
 * app_is_member), mais la barrière de type évite d'en arriver là.
 */
export function unsafeTenantContextForTests(userId: string, organizationId: string): TenantContext {
  return { userId, organizationId } as TenantContext;
}

/** Erreur levée quand un utilisateur demande une organisation dont il n'est pas membre. */
export class ForbiddenOrganizationError extends Error {
  constructor(userId: string, organizationId: string) {
    super(`Utilisateur ${userId} non membre de l'organisation ${organizationId}`);
    this.name = 'ForbiddenOrganizationError';
  }
}

/**
 * Levée quand un appelant fournit explicitement un organizationId différent de
 * celui du contexte. Découverte du Lot 0 : écraser silencieusement la valeur
 * est sûr (aucune fuite) mais masque un bug. On préfère échouer bruyamment.
 */
export class TenantScopeViolationError extends Error {
  constructor(expected: string, received: string) {
    super(`organizationId imposé par le contexte (${expected}), reçu ${received}`);
    this.name = 'TenantScopeViolationError';
  }
}
