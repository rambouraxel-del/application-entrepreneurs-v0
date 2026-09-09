import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/index';
import { systemDb } from '../src/lib/db/system';
import { todayInTimezone } from '../src/lib/datetime';
import { computeLine, computeDocumentTotals, type LineInput } from '../src/lib/billing/calc';
import { formatDocumentNumber } from '../src/lib/numbering/allocate';

/**
 * Jeu de données de démonstration — exécuté via le rôle SYSTÈME (BYPASSRLS),
 * le seul cas légitime pour écrire sans contexte tenant (docs/v1/lot-0-validation.md
 * §6.1). Deux organisations étanches pour vérifier l'isolation à l'œil en
 * local ; l'organisation A illustre chaque cas utile au Dashboard/Insights
 * (Lot 2 et Lot 3 — docs/v1/lot-3-devis.md §Seed).
 *
 * Dates relatives à "aujourd'hui" (jamais figées) : le seed reste utile quel
 * que soit le jour où il est rejoué.
 *
 * Les userId n'existent pas réellement dans Supabase Auth — ce seed sert à
 * peupler la base pour développer/tester l'UI localement, pas à se connecter
 * avec ces comptes (il faut créer de vrais comptes via /signup pour ça).
 *
 * Devis "émis" avec des dates PASSÉES (pour illustrer les règles de relance) :
 * le trigger d'immutabilité (prisma/rls.sql) n'autorise qu'une seule
 * transition issued_at NULL -> une date — rien n'empêche que cette date soit
 * dans le passé. On reproduit ici, à la main, exactement les étapes de
 * `quotes/service.ts::emitQuote` (numéro réel via le même compteur
 * transactionnel, snapshots, totaux) plutôt que de les court-circuiter — un
 * devis de démo doit rester un devis structurellement valide.
 */
function daysAgo(n: number): Date {
  const d = todayInTimezone();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function allocateNumber(organizationId: string, docType: 'quote' | 'invoice', year: number): Promise<string> {
  const rows = await systemDb.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO document_counters (organization_id, doc_type, year, last_value)
    VALUES (${organizationId}::uuid, ${docType}, ${year}, 1)
    ON CONFLICT (organization_id, doc_type, year)
    DO UPDATE SET last_value = document_counters.last_value + 1
    RETURNING last_value
  `;
  const prefix = docType === 'quote' ? 'DEV' : 'FAC';
  return formatDocumentNumber({ year, sequence: rows[0]!.last_value }, { prefix, includeYear: true, padding: 6 });
}

type DemoLine = LineInput & { description: string; unit?: string };

/** Reproduit les étapes réelles d'émission, avec une date d'émission choisie (pour illustrer les règles de relance/expiration). */
async function seedQuote(params: {
  organizationId: string;
  organizationName: string;
  clientId: string;
  clientName: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  lines: DemoLine[];
  issuedDaysAgo?: number;
  validUntil?: Date;
}) {
  const lineAmounts = params.lines.map((l) => computeLine(l));
  const totals = computeDocumentTotals(lineAmounts);

  const quote = await systemDb.quote.create({
    data: { organizationId: params.organizationId, clientId: params.clientId, validUntil: params.validUntil },
  });
  await systemDb.quoteLine.createMany({
    data: params.lines.map((l, i) => ({
      organizationId: params.organizationId,
      quoteId: quote.id,
      position: i + 1,
      description: l.description,
      unit: l.unit,
      quantityMilli: l.quantityMilli,
      unitPriceCents: l.unitPriceCents,
      vatRateBp: l.vatRateBp,
      discountBp: l.discountBp ?? 0,
      grossHtCents: lineAmounts[i]!.grossHtCents,
      discountCents: lineAmounts[i]!.discountCents,
      netHtCents: lineAmounts[i]!.netHtCents,
      vatCents: lineAmounts[i]!.vatCents,
      totalTtcCents: lineAmounts[i]!.totalTtcCents,
    })),
  });

  if (params.status === 'draft') {
    return systemDb.quote.update({
      where: { id: quote.id },
      data: { totalHtCents: totals.totalHtCents, totalVatCents: totals.totalVatCents, totalTtcCents: totals.totalTtcCents, vatBreakdown: totals.vatBreakdown },
    });
  }

  const issuedAt = daysAgo(params.issuedDaysAgo ?? 0);
  const number = await allocateNumber(params.organizationId, 'quote', issuedAt.getUTCFullYear());
  const issued = await systemDb.quote.update({
    where: { id: quote.id },
    data: {
      number,
      status: 'sent',
      issuedAt,
      clientSnapshot: { id: params.clientId, name: params.clientName, companyName: null, email: null, phone: null, kind: 'individual' },
      organizationSnapshot: { id: params.organizationId, name: params.organizationName },
      totalHtCents: totals.totalHtCents,
      totalVatCents: totals.totalVatCents,
      totalTtcCents: totals.totalTtcCents,
      vatBreakdown: totals.vatBreakdown,
    },
  });

  if (params.status === 'accepted') return systemDb.quote.update({ where: { id: quote.id }, data: { status: 'accepted' } });
  if (params.status === 'rejected') return systemDb.quote.update({ where: { id: quote.id }, data: { status: 'rejected' } });
  return issued;
}

type DemoOrganization = { id: string; legalName: string | null; tradeName: string | null; legalForm: string | null; siren: string | null; siret: string | null; vatNumber: string | null; vatRegime: string; addressLine1: string | null; addressLine2: string | null; addressPostalCode: string | null; addressCity: string | null; addressCountry: string; professionalEmail: string | null; professionalPhone: string | null; latePaymentPenaltyText: string; earlyPaymentDiscountText: string; latePaymentRecoveryFeeCents: number };
type DemoClient = { id: string; kind: string; name: string; billingLegalName: string | null; companyName: string | null; email: string | null; billingEmail: string | null; siren: string | null; vatNumber: string | null; billingAddressLine1: string | null; billingAddressLine2: string | null; billingAddressPostalCode: string | null; billingAddressCity: string | null; billingAddressCountry: string | null; deliveryAddressLine1: string | null; deliveryAddressLine2: string | null; deliveryAddressPostalCode: string | null; deliveryAddressCity: string | null; deliveryAddressCountry: string | null };

/**
 * Reproduit les étapes réelles d'émission d'une facture (mêmes snapshots que
 * `invoices/service.ts::emitInvoice`), avec des dates choisies pour illustrer
 * les statuts de paiement. Voir la note "Devis émis avec des dates passées"
 * ci-dessus — même raisonnement.
 */
async function seedInvoice(params: {
  organization: DemoOrganization;
  client: DemoClient;
  status: 'draft' | 'issued';
  lines: DemoLine[];
  issuedDaysAgo?: number;
  dueInDays?: number; // relatif à l'émission
  payments?: Array<{ amountCents: number; daysAgo: number; method?: string }>;
}) {
  const { organization, client } = params;
  const lineAmounts = params.lines.map((l) => computeLine(l));
  const totals = computeDocumentTotals(lineAmounts);

  const supplyDate = daysAgo(params.issuedDaysAgo ?? 0);
  const dueDate = new Date(supplyDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + (params.dueInDays ?? 30));

  const invoice = await systemDb.invoice.create({
    data: { organizationId: organization.id, clientId: client.id, supplyDate, dueDate },
  });
  await systemDb.invoiceLine.createMany({
    data: params.lines.map((l, i) => ({
      organizationId: organization.id,
      invoiceId: invoice.id,
      position: i + 1,
      description: l.description,
      unit: l.unit,
      quantityMilli: l.quantityMilli,
      unitPriceCents: l.unitPriceCents,
      vatRateBp: l.vatRateBp,
      discountBp: l.discountBp ?? 0,
      grossHtCents: lineAmounts[i]!.grossHtCents,
      discountCents: lineAmounts[i]!.discountCents,
      netHtCents: lineAmounts[i]!.netHtCents,
      vatCents: lineAmounts[i]!.vatCents,
      totalTtcCents: lineAmounts[i]!.totalTtcCents,
    })),
  });

  if (params.status === 'draft') {
    return systemDb.invoice.update({
      where: { id: invoice.id },
      data: { totalHtCents: totals.totalHtCents, totalVatCents: totals.totalVatCents, totalTtcCents: totals.totalTtcCents, vatBreakdown: totals.vatBreakdown },
    });
  }

  const issuedAt = daysAgo(params.issuedDaysAgo ?? 0);
  const number = await allocateNumber(organization.id, 'invoice', issuedAt.getUTCFullYear());
  const billingName = client.kind === 'company' ? client.billingLegalName || client.companyName : client.name;
  await systemDb.invoice.update({
    where: { id: invoice.id },
    data: {
      number,
      status: 'issued',
      issuedAt,
      issuerSnapshot: {
        legalName: organization.legalName, tradeName: organization.tradeName, legalForm: organization.legalForm,
        siren: organization.siren, siret: organization.siret, vatNumber: organization.vatNumber, vatRegime: organization.vatRegime,
        address: { line1: organization.addressLine1, line2: organization.addressLine2, postalCode: organization.addressPostalCode, city: organization.addressCity, country: organization.addressCountry },
        email: organization.professionalEmail, phone: organization.professionalPhone,
      },
      clientSnapshot: {
        kind: client.kind, name: billingName, email: client.billingEmail || client.email, siren: client.siren, vatNumber: client.vatNumber,
        billingAddress: { line1: client.billingAddressLine1, line2: client.billingAddressLine2, postalCode: client.billingAddressPostalCode, city: client.billingAddressCity, country: client.billingAddressCountry },
        deliveryAddress: client.deliveryAddressLine1
          ? { line1: client.deliveryAddressLine1, line2: client.deliveryAddressLine2, postalCode: client.deliveryAddressPostalCode, city: client.deliveryAddressCity, country: client.deliveryAddressCountry }
          : null,
      },
      paymentTermsSnapshot: {
        dueDate, latePaymentPenaltyText: organization.latePaymentPenaltyText,
        earlyPaymentDiscountText: organization.earlyPaymentDiscountText, latePaymentRecoveryFeeCents: organization.latePaymentRecoveryFeeCents,
      },
      totalHtCents: totals.totalHtCents, totalVatCents: totals.totalVatCents, totalTtcCents: totals.totalTtcCents,
      vatBreakdown: totals.vatBreakdown,
    },
  });

  for (const p of params.payments ?? []) {
    await systemDb.payment.create({
      data: { organizationId: organization.id, invoiceId: invoice.id, amountCents: p.amountCents, paidAt: daysAgo(p.daysAgo), method: (p.method ?? 'bank_transfer') as never },
    });
  }

  return systemDb.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
}

async function main() {
  console.log('Réinitialisation des données de démonstration…');
  // TRUNCATE plutôt que DELETE : les triggers d'immutabilité (paiements,
  // devis/factures émis — prisma/rls.sql) bloquent toute suppression ligne
  // par ligne, y compris pour le rôle système (BYPASSRLS s'applique à la
  // RLS, jamais aux triggers). TRUNCATE ne déclenche pas ces triggers et
  // nécessite le rôle PROPRIÉTAIRE (seul détenteur du privilège) — même
  // mécanisme que tests/helpers.ts, réservé ici au reset du seed.
  const ownerDb = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_OWNER });
  await ownerDb.$executeRawUnsafe(
    'TRUNCATE TABLE payments, invoice_lines, invoices, quote_lines, quotes, document_counters, tasks, clients, memberships, organizations RESTART IDENTITY CASCADE',
  );
  await ownerDb.$disconnect();

  // --- Identité légale complète (Lot 4 §48) : Organisation A prête à facturer.
  const orgA = await systemDb.organization.create({
    data: {
      name: 'Atelier Menuiserie Dupont', clientFollowUpDays: 30, quoteFollowUpDays: 7, quoteHighValueCents: 500_000,
      legalName: 'Dupont Menuiserie SARL', legalForm: 'SARL', siren: '552100554', siret: '55210055400028',
      vatNumber: 'FR40552100554', vatRegime: 'normal',
      addressLine1: '12 rue des Artisans', addressPostalCode: '69001', addressCity: 'Lyon', addressCountry: 'FR',
      professionalEmail: 'contact@dupont-menuiserie.example', professionalPhone: '0472000000',
      defaultPaymentTermDays: 30,
    },
  });
  // Organisation B : identité légale volontairement incomplète, pour
  // vérifier que `validateInvoiceIssuerReadiness` refuse l'émission tant
  // qu'elle ne l'est pas (docs/v1/lot-4-factures-paiements.md §5).
  const orgB = await systemDb.organization.create({
    data: { name: 'Studio Graphique Martin', clientFollowUpDays: 30, quoteFollowUpDays: 7, quoteHighValueCents: 500_000 },
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
      // Données de facturation complètes (Lot 4 §48) — ce client sert aux
      // scénarios de facture du seed.
      billingLegalName: 'Menuiserie du Parc SAS',
      billingAddressLine1: '4 avenue du Parc',
      billingAddressPostalCode: '69003',
      billingAddressCity: 'Lyon',
      billingAddressCountry: 'FR',
      billingEmail: 'compta@menuiserie-du-parc.example',
      siren: '482300123',
      vatNumber: 'FR12482300123',
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
    data: { organizationId: orgA.id, clientId: clientARelancer.id, title: 'Relancer Martin Dupont', dueDate: todayInTimezone(), priority: 'high' },
  });
  await systemDb.task.create({
    data: { organizationId: orgA.id, clientId: clientProspect.id, title: 'Envoyer la documentation à la Boulangerie Leroy', dueDate: daysAgo(3), priority: 'normal' },
  });
  await systemDb.task.create({
    data: { organizationId: orgA.id, clientId: clientActif.id, title: 'Confirmer le rendez-vous de suivi', dueDate: daysAgo(-2), priority: 'low' },
  });
  await systemDb.task.create({
    data: { organizationId: orgA.id, clientId: clientSansContactRecent.id, title: 'Devis envoyé — vérifier réception', dueDate: daysAgo(10), completedAt: daysAgo(9), priority: 'normal' },
  });

  // --- Devis Organisation A : un cas de chaque (docs/v1/lot-3-devis.md §31) --
  const uneLigne = (unitPriceCents: number, vatRateBp = 2000): DemoLine[] => [
    { description: 'Prestation', quantityMilli: 1000, unitPriceCents, vatRateBp },
  ];

  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientProspect.id, clientName: clientProspect.name,
    status: 'draft', lines: uneLigne(45000),
  });
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientActif.id, clientName: clientActif.name,
    status: 'sent', issuedDaysAgo: 2, lines: uneLigne(35000), validUntil: daysAgo(-28),
  }); // envoyé récent : ni alerte ni expiration proche
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientProspect.id, clientName: clientProspect.name,
    status: 'sent', issuedDaysAgo: 15, lines: uneLigne(80000), validUntil: daysAgo(-15),
  }); // envoyé ancien (> quoteFollowUpDays=7) : alerte "sans réponse"
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientSansContactRecent.id, clientName: clientSansContactRecent.name,
    status: 'sent', issuedDaysAgo: 20, lines: uneLigne(60000), validUntil: daysAgo(-3),
  }); // proche expiration (validUntil dans 3 jours)
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientSansContactRecent.id, clientName: clientSansContactRecent.name,
    status: 'sent', issuedDaysAgo: 1, lines: uneLigne(900000), validUntil: daysAgo(-60),
  }); // forte valeur (9 000 € > seuil 5 000 €)
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientActif.id, clientName: clientActif.name,
    status: 'accepted', issuedDaysAgo: 25, lines: uneLigne(120000),
  });
  await seedQuote({
    organizationId: orgA.id, organizationName: orgA.name, clientId: clientProspect.id, clientName: clientProspect.name,
    status: 'rejected', issuedDaysAgo: 10, lines: uneLigne(50000),
  });
  // Devis accepté SANS facture (§48) : la 6ᵉ ligne ci-dessus (clientActif,
  // 'accepted') n'est volontairement jamais transformée.

  // --- Factures Organisation A : un cas de chaque (§48) ---------------------
  await seedInvoice({ organization: orgA, client: clientSansContactRecent, status: 'draft', lines: uneLigne(90000) });
  await seedInvoice({
    organization: orgA, client: clientSansContactRecent, status: 'issued',
    lines: uneLigne(120000), issuedDaysAgo: 5, dueInDays: 30,
  }); // émise, non payée
  await seedInvoice({
    organization: orgA, client: clientSansContactRecent, status: 'issued',
    lines: uneLigne(200000), issuedDaysAgo: 10, dueInDays: 30,
    payments: [{ amountCents: 80000, daysAgo: 3 }],
  }); // partiellement payée
  await seedInvoice({
    organization: orgA, client: clientSansContactRecent, status: 'issued',
    lines: uneLigne(150000), issuedDaysAgo: 20, dueInDays: 15,
    payments: [{ amountCents: 180000, daysAgo: 5, method: 'card' }],
  }); // intégralement payée
  await seedInvoice({
    organization: orgA, client: clientSansContactRecent, status: 'issued',
    lines: uneLigne(60000), issuedDaysAgo: 45, dueInDays: 30,
  }); // en retard (échéance il y a 15 jours), non payée

  // --- Organisation B : jeu différent, pour les tests d'isolation ----------
  const clientB = await systemDb.client.create({
    data: { organizationId: orgB.id, kind: 'individual', name: 'Claire Fabre', email: 'claire.fabre@example.com', status: 'active', lastContactAt: daysAgo(2) },
  });
  await systemDb.task.create({
    data: { organizationId: orgB.id, clientId: clientB.id, title: 'Livrer la maquette finale', dueDate: todayInTimezone(), priority: 'high' },
  });
  await seedQuote({
    organizationId: orgB.id, organizationName: orgB.name, clientId: clientB.id, clientName: clientB.name,
    status: 'sent', issuedDaysAgo: 1, lines: uneLigne(150000),
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
