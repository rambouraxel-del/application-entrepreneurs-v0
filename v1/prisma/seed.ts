import { randomUUID } from 'node:crypto';
import { systemDb } from '../src/lib/db/system';
import { todayInTimezone } from '../src/lib/datetime';

/**
 * Jeu de données de démonstration — exécuté via le rôle SYSTÈME (BYPASSRLS),
 * le seul cas légitime pour écrire sans contexte tenant (docs/v1/lot-0-validation.md
 * §6.1). Deux organisations étanches pour vérifier l'isolation à l'œil en
 * local ; l'organisation A illustre chaque cas utile au Dashboard (Lot 2).
 *
 * Dates relatives à "aujourd'hui" (jamais figées) : le seed reste utile quel
 * que soit le jour où il est rejoué.
 *
 * Les userId n'existent pas réellement dans Supabase Auth — ce seed sert à
 * peupler la base pour développer/tester l'UI localement, pas à se connecter
 * avec ces comptes (il faut créer de vrais comptes via /signup pour ça).
 */
function daysAgo(n: number): Date {
  const d = todayInTimezone();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  console.log('Réinitialisation des données de démonstration…');
  await systemDb.task.deleteMany();
  await systemDb.client.deleteMany();
  await systemDb.membership.deleteMany();
  await systemDb.organization.deleteMany();

  const orgA = await systemDb.organization.create({
    data: { name: 'Atelier Menuiserie Dupont', clientFollowUpDays: 30 },
  });
  const orgB = await systemDb.organization.create({
    data: { name: 'Studio Graphique Martin', clientFollowUpDays: 30 },
  });

  const userA = randomUUID();
  const userB = randomUUID();
  await systemDb.membership.create({ data: { userId: userA, organizationId: orgA.id, role: 'owner' } });
  await systemDb.membership.create({ data: { userId: userB, organizationId: orgB.id, role: 'owner' } });

  // --- Organisation A : un cas de chaque, pour peupler le Dashboard --------
  const clientActif = await systemDb.client.create({
    data: {
      organizationId: orgA.id,
      kind: 'individual',
      name: 'Jean Petit',
      email: 'jean.petit@example.com',
      status: 'active',
      lastContactAt: daysAgo(5),
    },
  });
  const clientProspect = await systemDb.client.create({
    data: {
      organizationId: orgA.id,
      kind: 'company',
      name: 'Boulangerie Leroy',
      companyName: 'SARL Leroy',
      status: 'prospect',
    },
  });
  const clientARelancer = await systemDb.client.create({
    data: {
      organizationId: orgA.id,
      kind: 'individual',
      name: 'Martin Dupont',
      email: 'martin.dupont@example.com',
      status: 'to_follow_up',
      lastContactAt: daysAgo(12),
      notes: 'A demandé un rappel après ses vacances.',
    },
  });
  const clientSansContactRecent = await systemDb.client.create({
    data: {
      organizationId: orgA.id,
      kind: 'company',
      name: 'Menuiserie du Parc',
      companyName: 'Menuiserie du Parc SAS',
      status: 'loyal',
      lastContactAt: daysAgo(45), // > clientFollowUpDays (30) : opportunité "sans contact récent"
    },
  });
  await systemDb.client.create({
    data: {
      organizationId: orgA.id,
      kind: 'individual',
      name: 'Ancien client archivé',
      status: 'inactive',
      archivedAt: daysAgo(100),
    },
  });

  await systemDb.task.create({
    data: {
      organizationId: orgA.id,
      clientId: clientARelancer.id,
      title: 'Relancer Martin Dupont',
      dueDate: todayInTimezone(),
      priority: 'high',
    },
  });
  await systemDb.task.create({
    data: {
      organizationId: orgA.id,
      clientId: clientProspect.id,
      title: 'Envoyer la documentation à la Boulangerie Leroy',
      dueDate: daysAgo(3), // en retard
      priority: 'normal',
    },
  });
  await systemDb.task.create({
    data: {
      organizationId: orgA.id,
      clientId: clientActif.id,
      title: 'Confirmer le rendez-vous de suivi',
      dueDate: daysAgo(-2), // dans 2 jours — ne doit apparaître ni en retard ni aujourd'hui
      priority: 'low',
    },
  });
  await systemDb.task.create({
    data: {
      organizationId: orgA.id,
      clientId: clientSansContactRecent.id,
      title: 'Devis envoyé — vérifier réception',
      dueDate: daysAgo(10),
      completedAt: daysAgo(9),
      priority: 'normal',
    },
  });

  // --- Organisation B : jeu différent, pour les tests d'isolation ----------
  const clientB = await systemDb.client.create({
    data: {
      organizationId: orgB.id,
      kind: 'individual',
      name: 'Claire Fabre',
      email: 'claire.fabre@example.com',
      status: 'active',
      lastContactAt: daysAgo(2),
    },
  });
  await systemDb.task.create({
    data: {
      organizationId: orgB.id,
      clientId: clientB.id,
      title: 'Livrer la maquette finale',
      dueDate: todayInTimezone(),
      priority: 'high',
    },
  });

  console.log('OK —', { orgA: orgA.id, orgB: orgB.id });
  console.log("Pour se connecter réellement, créez un compte via /signup (ce seed ne crée pas d'utilisateur Supabase Auth).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await systemDb.$disconnect();
  });
