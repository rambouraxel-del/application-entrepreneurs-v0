import { randomUUID } from 'node:crypto';
import { systemDb } from '../src/lib/db/system';

/**
 * Jeu de données de démonstration — exécuté via le rôle SYSTÈME (BYPASSRLS),
 * le seul cas légitime pour écrire sans contexte tenant (docs/v1/lot-0-validation.md
 * §6.1). Reproduit volontairement le scénario A/B des tests d'isolation :
 * deux organisations étanches, pour pouvoir vérifier la RLS à l'œil en local.
 *
 * Ne contourne pas la RLS "par accident" : c'est le rôle système, prévu pour
 * ça, et rien d'autre que ce chemin ne peut écrire sans contexte.
 *
 * Les userId n'existent pas réellement dans Supabase Auth — ce seed sert à
 * peupler la base pour développer/tester l'UI localement, pas à se connecter
 * avec ces comptes (il faut créer de vrais comptes via /signup pour ça).
 */
async function main() {
  console.log('Réinitialisation des données de démonstration…');
  await systemDb.client.deleteMany();
  await systemDb.membership.deleteMany();
  await systemDb.organization.deleteMany();

  const orgA = await systemDb.organization.create({ data: { name: 'Atelier Menuiserie Dupont' } });
  const orgB = await systemDb.organization.create({ data: { name: 'Studio Graphique Martin' } });

  const userA = randomUUID();
  const userB = randomUUID();
  await systemDb.membership.create({ data: { userId: userA, organizationId: orgA.id, role: 'owner' } });
  await systemDb.membership.create({ data: { userId: userB, organizationId: orgB.id, role: 'owner' } });

  await systemDb.client.createMany({
    data: [
      { organizationId: orgA.id, kind: 'individual', name: 'Jean Petit', email: 'jean.petit@example.com', status: 'active' },
      { organizationId: orgA.id, kind: 'company', name: 'Boulangerie Leroy', companyName: 'SARL Leroy', status: 'prospect' },
      { organizationId: orgB.id, kind: 'individual', name: 'Claire Fabre', email: 'claire.fabre@example.com', status: 'active' },
    ],
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
