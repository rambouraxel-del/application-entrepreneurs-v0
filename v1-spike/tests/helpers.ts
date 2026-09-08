import { systemPrisma } from '../src/db/client.js';

/**
 * Fabrication des jeux d'essai via le rôle SYSTÈME (BYPASSRLS).
 *
 * C'est volontaire et cohérent avec la production : au moment de
 * l'inscription, aucune organisation n'existe encore, donc aucun contexte
 * tenant ne peut être posé. Ce chemin est isolé et assumé (architecture §6.1).
 */
export async function resetDatabase() {
  // Suppressions ordonnées plutôt que TRUNCATE : le rôle système ne dispose
  // volontairement que de SELECT/INSERT/UPDATE/DELETE, comme en production.
  await systemPrisma.issuedDocument.deleteMany();
  await systemPrisma.documentCounter.deleteMany();
  await systemPrisma.client.deleteMany();
  await systemPrisma.membership.deleteMany();
  await systemPrisma.organization.deleteMany();
  await systemPrisma.user.deleteMany();
}

export type Fixture = {
  orgA: string; orgB: string;
  userA: string; userB: string;
  clientA: string; clientB: string;
};

/** Deux organisations étanches, un utilisateur et un client chacune. */
export async function seedTwoOrganizations(): Promise<Fixture> {
  const orgA = await systemPrisma.organization.create({ data: { name: 'Org A', legalName: 'A SARL' } });
  const orgB = await systemPrisma.organization.create({ data: { name: 'Org B', legalName: 'B SARL' } });
  const userA = await systemPrisma.user.create({ data: { email: 'a@spike.test' } });
  const userB = await systemPrisma.user.create({ data: { email: 'b@spike.test' } });
  await systemPrisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id } });
  await systemPrisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id } });
  const clientA = await systemPrisma.client.create({
    data: { organizationId: orgA.id, name: 'Client A', email: 'client-a@spike.test' },
  });
  const clientB = await systemPrisma.client.create({
    data: { organizationId: orgB.id, name: 'Client B', email: 'client-b@spike.test' },
  });

  return {
    orgA: orgA.id, orgB: orgB.id,
    userA: userA.id, userB: userB.id,
    clientA: clientA.id, clientB: clientB.id,
  };
}
