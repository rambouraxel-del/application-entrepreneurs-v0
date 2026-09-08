/**
 * Contexte tenant — la seule source autorisée d'un organizationId.
 *
 * Porte le mécanisme éprouvé au Lot 0 (docs/v1/lot-0-validation.md) :
 * l'organizationId n'est JAMAIS lu depuis une entrée navigateur (URL,
 * formulaire, en-tête). Il est toujours dérivé côté serveur de la session,
 * puis vérifié contre les appartenances réelles de l'utilisateur.
 *
 * `TenantContext` est un type MARQUÉ : le seul producteur légitime est
 * `resolveTenantContext()` (src/modules/organizations/service.ts), qui
 * vérifie l'appartenance avant de le construire. Un contexte fabriqué à la
 * main ne compile pas — découverte du Lot 0 (§8.2) : sans cette barrière, un
 * contexte { userId: A, organizationId: B } traversait à la fois l'extension
 * Prisma et une RLS mal conçue.
 */
declare const verified: unique symbol;

export type TenantContext = {
  readonly userId: string;
  readonly organizationId: string;
  readonly [verified]: true;
};

/** Producteur unique et légitime — appelé après vérification de l'appartenance. */
export function verifiedTenantContext(userId: string, organizationId: string): TenantContext {
  return { userId, organizationId } as TenantContext;
}

/**
 * Réservé aux tests. Nom volontairement dissuasif : produire un contexte sans
 * vérifier l'appartenance est précisément la faille mise en évidence au Lot 0.
 * La RLS (policy `app_is_member`) refuse un tel contexte même s'il est produit
 * ici ; cette fonction ne sert qu'à construire des scénarios de test.
 */
export function unsafeTenantContextForTests(userId: string, organizationId: string): TenantContext {
  return { userId, organizationId } as TenantContext;
}

export class ForbiddenOrganizationError extends Error {
  constructor(userId: string, organizationId: string) {
    super(`Utilisateur ${userId} non membre de l'organisation ${organizationId}`);
    this.name = 'ForbiddenOrganizationError';
  }
}

/**
 * Levée quand un appelant fournit un organizationId différent de celui du
 * contexte en cours (ex. tentative de création dans une autre organisation).
 * Écraser silencieusement serait sûr (aucune fuite) mais masquerait un bug :
 * on préfère échouer bruyamment (découverte du Lot 0).
 */
export class TenantScopeViolationError extends Error {
  constructor(expected: string, received: string) {
    super(`organizationId imposé par le contexte (${expected}), reçu ${received}`);
    this.name = 'TenantScopeViolationError';
  }
}
