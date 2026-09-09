import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/index';
import { systemDb } from '../src/lib/db/system';

/**
 * Fabrication des jeux d'essai via le rôle SYSTÈME (BYPASSRLS) — le seul
 * chemin qui peut écrire sans contexte tenant, cohérent avec la production
 * (docs/v1/lot-0-validation.md §6.1).
 *
 * Pas de table `users` locale (décision Lot 1, voir prisma/schema.prisma) :
 * les identifiants utilisateur sont ceux de Supabase Auth. En test, on les
 * simule avec un UUID aléatoire — aucune FK ne l'exige.
 *
 * Reset : le trigger d'immutabilité (prisma/rls.sql) bloque toute
 * suppression de ligne d'un devis émis — y compris pour le rôle système
 * (BYPASSRLS s'applique à la RLS, jamais aux triggers : c'est la même
 * garantie qui protège la production). `TRUNCATE` n'exécute pas les
 * triggers ligne par ligne (contrairement à `DELETE`) et n'est pas gouverné
 * par la RLS : on l'utilise ici, avec le rôle PROPRIÉTAIRE (seul détenteur
 * du privilège TRUNCATE), réservé aux TESTS — jamais au code applicatif.
 */
const ownerDb = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_OWNER });

export async function resetDatabase() {
  await ownerDb.$executeRawUnsafe(
    'TRUNCATE TABLE payments, invoice_lines, invoices, quote_lines, quotes, document_counters, tasks, clients, memberships, organizations RESTART IDENTITY CASCADE',
  );
}

export type Fixture = {
  orgA: string; orgB: string;
  userA: string; userB: string;
  clientA: string; clientB: string;
  taskA: string; taskB: string;
};

/** Deux organisations étanches, un utilisateur, un client et une tâche chacune. */
export async function seedTwoOrganizations(): Promise<Fixture> {
  const orgA = await systemDb.organization.create({ data: { name: 'Org A' } });
  const orgB = await systemDb.organization.create({ data: { name: 'Org B' } });
  const userA = randomUUID();
  const userB = randomUUID();
  await systemDb.membership.create({ data: { userId: userA, organizationId: orgA.id, role: 'owner' } });
  await systemDb.membership.create({ data: { userId: userB, organizationId: orgB.id, role: 'owner' } });
  const clientA = await systemDb.client.create({
    data: { organizationId: orgA.id, name: 'Client A', email: 'client-a@test.local' },
  });
  const clientB = await systemDb.client.create({
    data: { organizationId: orgB.id, name: 'Client B', email: 'client-b@test.local' },
  });
  const taskA = await systemDb.task.create({
    data: { organizationId: orgA.id, clientId: clientA.id, title: 'Tâche A' },
  });
  const taskB = await systemDb.task.create({
    data: { organizationId: orgB.id, clientId: clientB.id, title: 'Tâche B' },
  });

  return {
    orgA: orgA.id, orgB: orgB.id,
    userA, userB,
    clientA: clientA.id, clientB: clientB.id,
    taskA: taskA.id, taskB: taskB.id,
  };
}

/**
 * Complète l'identité légale d'une organisation et les données de
 * facturation d'un client — le minimum pour que `assertInvoiceIssuerReady`/
 * `assertClientBillingReady` (modules/invoices/readiness.ts) laissent passer
 * une émission de facture dans les tests (docs/v1/lot-4-factures-paiements.md).
 */
export async function makeInvoicingReady(organizationId: string, clientId: string) {
  await systemDb.organization.update({
    where: { id: organizationId },
    data: {
      legalName: 'Test SARL', siret: '55210055400028',
      addressLine1: '1 rue de Test', addressPostalCode: '75001', addressCity: 'Paris',
    },
  });
  await systemDb.client.update({
    where: { id: clientId },
    data: {
      billingAddressLine1: '2 rue Client', billingAddressPostalCode: '75002', billingAddressCity: 'Paris',
    },
  });
}
