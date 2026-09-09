# Lot 4 — Factures + Paiements (compte rendu)

> Suite du Lot 3 (`lot-3-devis.md`). Premier workflow financier **immuable
> et encaissable** de la V1 : Devis accepté → Facture → Encaissement. Une
> facture émise est un document historique fiable ; un paiement est un
> fait traçable ; le Dashboard n'affiche que des montants dont la
> définition est exacte et explicite.

---

## 1. Résumé

Un utilisateur authentifié peut : transformer un devis **accepté** (et
uniquement accepté) en facture brouillon, éditer/recalculer ses lignes,
émettre la facture (numéro fiable sur un compteur séparé des devis,
snapshots figés, montants recalculés serveur), enregistrer des paiements
(partiels ou complets, jamais de surpaiement), suivre le statut de
paiement dérivé (impayée/partielle/payée/en retard), annuler un paiement
erroné sans jamais le supprimer, télécharger le PDF de la facture, et voir
le Dashboard afficher Facturé/À encaisser/En retard/Encaissé — jamais un
"chiffre d'affaires" non défini.

## 2. Identité légale

`Organization` enrichie (raison sociale, forme juridique, SIREN/SIRET,
numéro de TVA, adresse structurée, email/téléphone professionnels, régime
de TVA, option TVA sur les débits, délai de paiement par défaut,
pénalités de retard/escompte, indemnité forfaitaire de recouvrement) via
une UI minimale (`/app/settings` — sections Identité légale / Adresse /
TVA / Conditions de paiement), pas une refonte complète des réglages.

`Client` enrichi symétriquement (adresse de facturation structurée,
adresse de livraison optionnelle, SIREN, numéro de TVA, email de
facturation, raison sociale de facturation) — repliable dans une section
"Facturation" du formulaire existant plutôt que de transformer la fiche
Client en formulaire administratif.

Ces deux enrichissements alimentent directement le **gardien d'émission**
(§5) : une facture réelle ne doit jamais pouvoir être émise avec des
données émetteur/client incomplètes.

## 3. Modèle Invoice

`Invoice` : `id, organizationId, clientId, sourceQuoteId? (unique),
number?, status (draft|issued), issuedAt?, supplyDate, dueDate,
operationCategory (goods|services|mixed), purchaseOrderNumber?,
vatOnDebits, notes?, issuerSnapshot?, clientSnapshot?,
paymentTermsSnapshot?, totalHtCents, totalVatCents, totalTtcCents,
vatBreakdown, pdfPath?, pdfSha256?, createdAt, updatedAt`.

`InvoiceLine` : copie structurelle de `QuoteLine` (`position, description,
unit?, quantityMilli, unitPriceCents, vatRateBp, vatExemptionCode?,
vatLegalNotice?, discountBp, grossHtCents, discountCents, netHtCents,
vatCents, totalTtcCents`) — **jamais partagée** avec `QuoteLine` : une
facture copie les lignes au moment de la transformation, elle ne
référence jamais les lignes du devis source.

`Payment` (P0, voir §10) : `id, organizationId, invoiceId, amountCents,
paidAt, method, reference?, note?, idempotencyKey?, cancelledAt?,
cancellationReason?, createdAt`.

Écarts assumés par rapport à `docs/v1/data-model.md` :
- **ADR-19 : pas de colonne `amount_paid_cents` stockée sur `Invoice`.**
  Le montant payé/restant dû est **toujours dérivé** par somme des
  `Payment` actifs (non annulés) — jamais une deuxième vérité stockée en
  parallèle des paiements eux-mêmes. `data-model.md` envisageait un
  agrégat stocké ; au volume MVP, la dérivation à la lecture est plus
  sûre (aucun risque de désynchronisation) et suffisamment performante.
- `Invoice.status` reste **`draft`/`issued` uniquement** — le statut de
  paiement n'est jamais un état du document (voir §12).
- Pas de `PaymentLine` ni de rapprochement bancaire (hors périmètre P0,
  voir §60 des consignes / §20 ci-dessous).
- `operationCategory`/`vatOnDebits`/adresse de livraison ajoutés
  directement sur `Invoice`/`ClientSnapshot` en anticipation des 4
  nouvelles mentions obligatoires (1er septembre 2026, voir §18).

## 4. Quote → Invoice

`invoices/service.ts::transformQuoteToInvoice(ctx, quoteId)` :
1. charge le devis, vérifie qu'il est **`accepted`** (jamais
   draft/sent/rejected/expired) ;
2. copie lignes/client/montants dans une facture `draft` — jamais une
   référence vivante au devis (le devis peut ensuite disparaître de
   l'écran, la facture reste complète) ;
3. la relation `Invoice.sourceQuoteId` est **`@unique`** en base — la
   protection contre une double transformation n'est pas qu'applicative.

**Test de concurrence réel** (`tests/invoices.test.ts`) : 3 tentatives de
transformation simultanées du même devis via `Promise.allSettled` →
exactement une facture créée, les deux autres refusées proprement
(violation de contrainte unique interceptée et traduite en erreur
métier lisible).

Le devis Émis reflète la facture existante : sur un devis `accepted` sans
facture, le bouton "Créer la facture" apparaît ; dès qu'une facture
existe, il devient "Voir la facture" — jamais de bouton créant une
deuxième facture par accident.

## 5. Calcul financier

Le calculateur a été **déplacé** de `modules/quotes/calc.ts` vers
`lib/billing/calc.ts` (tous les importeurs mis à jour) pour que Devis et
Facture partagent **littéralement la même implémentation** — jamais deux
moteurs de calcul. Même arithmétique entière BigInt (centimes/millièmes/
points de base), même ordre d'arrondi half-up, mêmes totaux = somme des
lignes déjà arrondies (voir `lot-3-devis.md` §3).

Ajout Lot 4 : `vatExemptionCode`/`vatLegalNotice` sur `InvoiceLine` pour
une ligne à taux zéro — un `vatRateBp = 0` seul ne suffit jamais, un motif
d'exonération explicite (ex. franchise en base, art. 293 B du CGI) est
requis. Le calculateur lui-même reste inchangé : il ne modélise pas tous
les régimes de TVA français, seulement l'arithmétique.

## 6. Émission

`invoices/service.ts::emitInvoice(ctx, invoiceId)`, transaction unique :
1. auth → contexte tenant → charge la facture brouillon ;
2. vérifie le client (appartenance à l'organisation) ;
3. **gardien de disponibilité** (§ suivant) : refuse si l'émetteur ou le
   client n'ont pas les données minimales de facturation ;
4. recalcule tout côté serveur à partir des lignes réellement en base ;
5. fige `issuerSnapshot`/`clientSnapshot`/`paymentTermsSnapshot` ;
6. alloue le numéro (compteur séparé, §7) ;
7. une seule instruction `UPDATE` fige `number/status/issuedAt/snapshots/
   totaux` — `issuedAt` posé côté serveur, jamais manipulable par
   l'utilisateur dans ce MVP ;
8. commit — ou rollback complet à la moindre erreur.

Le PDF est généré **après** le commit (jamais de transaction DB tenue
ouverte pendant un appel réseau Storage) : un échec de rendu n'invalide
pas l'émission (le numéro est déjà acquis) — régénérable depuis le
snapshot immuable via une action dédiée.

**Gardien d'émission** (`invoices/readiness.ts`) : deux fonctions pures,
testables sans base — `checkInvoiceIssuerReadiness(org)` et
`checkClientBillingReadiness(client)` — retournent la liste des champs
manquants (raison sociale, adresse complète, SIREN **ou** SIRET, format
structurel du numéro de TVA le cas échéant). Appelées à la fois côté UI
(bandeau d'alerte dans les réglages, bouton "Émettre" masqué si non prêt)
et **côté service au moment de l'émission** — jamais une garantie fondée
sur l'UI seule.

## 7. Numérotation

Mécanisme du Lot 0, **réutilisé sans modification** avec un
**compteur séparé** (`docType: 'invoice'`) : `INSERT ... ON CONFLICT DO
UPDATE SET last_value = last_value + 1 RETURNING`, dans la transaction
d'émission — jamais `MAX+1`/`COUNT+1`. Format `FAC-{année}-{6 chiffres}`,
compatible avec l'exigence de séquence continue/chronologique (le numéro
n'est alloué qu'à l'émission, jamais à la création du brouillon).

**Test de concurrence réel et bloquant, sur le vrai modèle `Invoice`**
(`tests/invoices.test.ts`) : 50 émissions concurrentes → 50 numéros
strictement uniques et consécutifs, aucune collision, aucun trou.

## 8. Immutabilité

Même mécanisme **au niveau base de données** que les devis (Lot 3),
adapté aux factures :
- `invoices_protect_issued` : bloque toute `UPDATE` sur les colonnes
  gelées (client, snapshots, lignes, prix, TVA, totaux, dates de
  document, numéro, conditions de paiement, identité légale figée) une
  fois `status = 'issued'` — seuls `pdfPath`/`pdfSha256` restent
  modifiables (régénération du PDF) ;
- `invoices_forbid_delete_issued` : une facture émise n'est **jamais**
  supprimable ;
- `invoice_lines_protect_issued` : les lignes d'une facture émise sont
  gelées elles aussi.

**BYPASSRLS ne contourne pas les triggers** (leçon confirmée à nouveau ce
lot) : la réinitialisation de test/seed passe par `TRUNCATE` via le rôle
propriétaire, jamais par `DELETE`.

Aucun bouton "Annuler" ne mute silencieusement une facture émise. La
correction par avoir (facture d'avoir) est **explicitement hors
périmètre du Lot 4** — documentée comme limite pré-bêta (§20), pas
contournée par un faux bouton.

## 9. PDF

Réutilisation directe de l'architecture Lot 3 (`@react-pdf/renderer`,
génération après commit, non bloquante, régénérable). Le PDF Facture
réel affiche : émetteur, client, numéro, dates (émission/livraison/
échéance), lignes, ventilation HT/TVA par taux, TTC, conditions de
paiement (délai, pénalités, escompte, indemnité forfaitaire), mentions
applicables. **L'UI n'affirme jamais "conforme légalement"** — voir §18.

## 10. Payment

Modèle P0 volontairement simple (voir §3) : pas de `PaymentLine`, pas de
rapprochement bancaire, pas de Stripe, pas de paiement en ligne. Méthode
fermée (`bank_transfer/card/cash/check/direct_debit/other`). Paiements
partiels supportés — payé/restant dû **toujours dérivés** (ADR-19).

`payments/service.ts::recordPayment` — transactionnel :
1. si `idempotencyKey` fourni et déjà vu, renvoie le paiement existant
   sans rien créer (double-clic/retry, §11) ;
2. **verrouille la facture** (`SELECT ... FOR UPDATE`, §11) ;
3. vérifie que la facture est `issued` (jamais un brouillon) ;
4. recalcule le restant dû à partir des paiements actifs déjà en base ;
5. **refuse tout surpaiement** (`amount > remainingCents`) et refuse tout
   paiement sur une facture déjà intégralement payée ;
6. crée le paiement.

`cancelPayment` : jamais un `DELETE` — pose `cancelledAt`/
`cancellationReason`, le paiement reste en base pour l'historique et
sort du calcul de payé/restant dû. Triggers `payments_protect_recorded`/
`payments_forbid_delete` en base : un paiement ne peut être ni modifié
(hors annulation) ni supprimé, même par un rôle applicatif compromis.

## 11. Concurrence Payment

Point critique explicitement testé sous charge réelle
(`tests/payments.test.ts`) :

- **Verrou transactionnel** : `SELECT id FROM invoices WHERE id = $1::uuid
  FOR UPDATE` à l'intérieur de la transaction `withTenant` — toute
  transaction concurrente visant la **même** facture attend le commit/
  rollback de la première avant de lire un restant dû à jour. Testé :
  2 paiements simultanés de 80 € sur 100 € restants → exactement 1
  réussit, l'autre est proprement refusé (jamais 160 € encaissés).
  Étendu à 50 tentatives concurrentes de 100 € sur une facture de
  1200 € → exactement 12 réussissent (12 × 100 = 1200), jamais plus.
- **Idempotence** : clé stable générée côté client (`useId()` React) +
  contrainte unique `(organization_id, idempotency_key)` en base. Bug réel
  trouvé et corrigé pendant ce lot : la récupération après violation
  d'unicité tentait initialement une lecture **dans la même transaction**
  que l'erreur — Postgres avorte toute la transaction dès la première
  erreur (`25P02`), rendant cette lecture impossible. Corrigé en
  récupérant l'existant dans une **transaction fraîche**, après avoir
  laissé la première échouer proprement. Testé : soumissions séquentielles
  et **concurrentes** avec la même clé → un seul paiement créé, les deux
  appels renvoient le même enregistrement.
- **Annulation traçable** : testée — un paiement annulé sort bien du
  restant dû calculé, reste lisible dans l'historique, ne peut pas être
  annulé deux fois.

## 12. Statuts

`Invoice.status` (cycle documentaire) reste **`draft`/`issued`
uniquement** — jamais étendu à `paid`/`overdue`/etc. Le statut de
**paiement** (`src/modules/invoices/paymentStatus.ts`) est un axe
**orthogonal, dérivé à la volée**, jamais stocké :

- `unpaid` : aucun paiement actif ;
- `partial` : paiements actifs > 0 et < total ;
- `paid` : paiements actifs ≥ total ;
- `overdue` : `issued` **et** restant dû > 0 **et** `dueDate` < date de
  référence.

`derivePaymentStatus({ issuedAt, dueDate, totalTtcCents, payments,
today })` prend une date de référence en paramètre — jamais
`new Date()` en dur — pour rester testable de façon déterministe.

## 13. Dashboard

`getDashboardSnapshot` étendu avec des définitions **explicites et
documentées en commentaire** (jamais un chiffre ambigu) :

- **Facturé** (`billedCents`) = somme de `totalTtcCents` des factures
  **émises** (cumul, pas de fenêtre de dates au Lot 4).
- **À encaisser** (`outstandingCents`) = somme des restants dus (> 0)
  des factures émises.
- **En retard** (`overdueCents`/`overdueInvoicesCount`) = somme des
  restants dus des factures émises dont `dueDate` < aujourd'hui.
- **Encaissé** (`collectedCents`) = somme des montants des paiements
  **actifs** (non annulés), cumul.

Devis et factures ne sont **jamais additionnés** — aucun double comptage
d'une même vente. Aucun de ces champs n'est jamais nommé "chiffre
d'affaires" (notion comptable/fiscale non établie ici).

## 14. Insights

2 nouvelles règles déterministes (`src/modules/insights/rules.ts`) :

| Règle | Condition | Type / priorité |
|---|---|---|
| `invoiceOverdue` | émise, restant dû > 0, `dueDate` dépassée | `alert` / `critical` si > 30 j de retard, sinon `high` |
| `invoiceDueSoon` | émise, restant dû > 0, échéance dans les 7 prochains jours (fixe, ⚑ hypothèse) | `alert` / `normal` |

Les deux enrichissent leur description avec "payé partiellement" quand un
paiement partiel existe. Une facture intégralement payée ne génère
**aucun** insight (pas de pollution du Dashboard). Chaque insight pointe
vers une page réelle (`/app/invoices/[id]`) — jamais une carte morte.

## 15. Multi-tenancy

`Invoice`/`InvoiceLine`/`Payment` ajoutés à l'extension Prisma (garde-fou)
et à la RLS (`prisma/rls.sql`), même policy `tenant_isolation` que les
autres tables métier. Testé explicitement (`tests/invoices.test.ts`,
`tests/payments.test.ts`) : A ne voit/crée/modifie jamais rien qui
appartienne à B (factures, lignes, paiements), y compris en connaissant
un UUID ; A ne peut pas annuler un paiement de B ; une insertion SQL brute
sous le rôle applicatif visant l'organisation de B est bloquée par la
RLS.

## 16. Facturation électronique

**Architecture préparée, aucune intégration réelle** — conformément à la
consigne : Cockpit ne cherche pas à devenir une Plateforme Agréée (PA).

- `modules/einvoicing/port.ts` : interface `EInvoicePort` (`submit`) +
  `NullEInvoiceAdapter`, qui **refuse systématiquement** ("aucun
  fournisseur configuré") — aucun appel réseau, aucun choix de
  prestataire fait à ce stade.
- `modules/einvoicing/mapping.ts` : `buildEInvoicePayload(invoice)`, une
  fonction pure qui projette le modèle `Invoice` (émetteur/client,
  SIREN/SIRET/TVA, adresses de facturation et de livraison, catégorie
  d'opération, lignes, totaux, dates, identifiants) vers une structure
  neutre — **sans** stocker de format Factur-X/UBL/CII dans le domaine
  métier. 8 tests de mapping pur, sans DB ni réseau.

**Cockpit ne permet pas aujourd'hui à une entreprise de satisfaire son
obligation de réception électronique** (pas de module facture
fournisseur/achat connecté à une PA) — limite explicitement documentée
(§20), pas contournée.

## 17. Cloud

**Statut inchangé depuis les Lots 1-3 : VALIDATION CLOUD REQUISE.** Aucun
credential Supabase disponible dans cet environnement pour le Lot 4 non
plus. Le protocole de validation manuelle (`lot-1-socle.md` §13) reste à
exécuter avant toute mise en production ; le métier Facture/Paiement n'a
pas été bloqué par cette limite.

## 18. Réglementaire

Vérifié via sources officielles (economie.gouv.fr, impots.gouv.fr) avant
modélisation, à la date du 9 septembre 2026 :
- réception électronique obligatoire pour **toutes** les entreprises
  depuis le 1er septembre 2026 ;
- émission obligatoire pour les grandes entreprises/ETI depuis le
  1er septembre 2026, pour les PME/microentreprises à partir du
  1er septembre 2027 ;
- 4 nouvelles mentions obligatoires depuis le 1er septembre 2026 :
  catégorie de l'opération (biens/services/mixte), mention de l'option
  pour le paiement de la TVA d'après les débits le cas échéant, adresse
  de livraison si différente de l'adresse de facturation.

Couvert par le modèle Lot 4 : `operationCategory`, `vatOnDebits`,
adresse de livraison sur `Client`/`clientSnapshot`, identité légale
complète de l'émetteur, mentions de conditions de paiement (délai,
pénalités, escompte, indemnité forfaitaire de recouvrement).

⚑ **À VALIDER JURIDIQUEMENT** (aucune de ces affirmations n'est faite
dans l'UI) :
- Le PDF généré n'est **pas** affirmé "conforme légalement" — c'est un
  document lisible reprenant les mentions modélisées, pas une validation
  par un professionnel du droit/de la comptabilité.
- Le format exact et l'exhaustivité des mentions légales obligatoires
  d'une facture française (au-delà des 4 mentions vérifiées ci-dessus)
  restent à faire valider par un expert-comptable avant tout usage réel.
- Le régime de TVA (`franchise_en_base`/`normal`) et les motifs
  d'exonération (`vatExemptionCode`) modélisés ne couvrent pas tous les
  cas particuliers du droit fiscal français.
- Cockpit ne permet pas de satisfaire l'obligation de réception
  électronique (voir §16) — à ne pas présenter comme conforme.

## 19. Tests

**230 tests Vitest**, tous verts, contre une vraie base PostgreSQL locale
(+72 par rapport aux 158 du Lot 3) :

- `tests/invoices.test.ts` (21, nouveau) : transformation Devis→Facture
  (unicité applicative **et** contrainte unique en base, testée sous
  concurrence réelle à 3), CRUD des lignes, émission gardée par la
  disponibilité (émetteur/client), numérotation (séquence sans trou,
  **50 émissions concurrentes réelles**), immutabilité (snapshots
  survivent à une modification ultérieure de l'Organization/Client,
  mutation directe refusée par la base, suppression impossible),
  isolation multi-tenant.
- `tests/payments.test.ts` (20, nouveau) : enregistrement/paiements
  partiels cumulés, refus de surpaiement, **concurrence réelle** (2×80€
  sur 100€ restants → 1 seul réussit ; 50×100€ sur 1200€ → exactement 12
  réussissent), idempotence séquentielle et concurrente, annulation
  traçable (jamais un delete), multi-tenancy.
- `tests/einvoicing.test.ts` (8, nouveau) : mapping pur, refus explicite
  du `NullEInvoiceAdapter`.
- `tests/readiness.test.ts` (10, nouveau) : gardien d'émission pur
  (émetteur et client), sans DB.
- `tests/insights.test.ts` (47, +11) : règles `invoiceOverdue`/
  `invoiceDueSoon`, déclenchement/non-déclenchement, priorité selon
  l'ancienneté du retard.
- `tests/dashboard.test.ts` (11, +2) : définitions exactes de Facturé/À
  encaisser/En retard/Encaissé (facture payée exclue, paiement annulé
  exclu, brouillon exclu, aucune fuite entre organisations).
- Suites héritées inchangées et toujours vertes : `quotes` (31), `calc`
  (19), `numbering` (10), `clients` (15), `tasks` (14), `organizations`
  (6), `isolation` (18).

Lint (`eslint .`), typecheck (`tsc --noEmit`), build (`next build`) :
tous verts. Tests V0 (racine du dépôt) : **5/6** — `insights-engine.
test.js` échoue sur un fixture de date en dur (`new Date(2026, 8, 8)`,
"30 jours" devenu 31 le jour du run) ; confirmé via `git log` que ce
fichier n'a pas été touché depuis la V0.13, **avant** tout lot V1 — bug
préexistant, non introduit par ce lot, **non corrigé** conformément à la
consigne de ne jamais toucher la V0. Aucun fichier hors `v1/` modifié
(vérifié par diff explicite). Scan de secrets sur le diff complet du lot :
aucun résultat.

## 20. Limites avant bêta

À traiter explicitement avant toute mise en production réelle,
**non implémentées volontairement à ce lot** :
- Validation juridique complète des mentions (voir §18).
- Correction par avoir (facture d'avoir) — aucune correction d'une
  facture émise n'est possible aujourd'hui au-delà de l'enregistrement/
  annulation de paiements.
- Validation Auth cloud et Storage cloud (protocole documenté, jamais
  exécuté faute de credentials Supabase, voir §17).
- Intégration facturation électronique réelle selon le calendrier cible
  (émission obligatoire PME/micro : 1er septembre 2027) — architecture
  prête (§16), aucun fournisseur choisi.
- Sauvegardes, email transactionnel, abonnement/paiement du logiciel
  lui-même — hors périmètre produit à ce stade.
- Rapprochement bancaire, comptabilité générale/plan comptable, Stripe/
  paiement en ligne, prélèvement automatique — explicitement hors
  périmètre Lot 4 (voir consigne §60), pas amorcés même partiellement.
- Relances email automatiques, envoi de facture par email — hors
  périmètre, les insights signalent mais n'envoient rien.

## 21. Architecture modifiée

- `docs/v1/architecture.md` : nouvelles entrées ADR (identité légale
  Organization/Client, ADR-19 pas d'agrégat `amount_paid_cents` stocké,
  compteur de numérotation séparé par `docType`, statut de paiement
  dérivé et jamais stocké, port `EInvoicePort`/`NullEInvoiceAdapter`),
  roadmap Lot 4 passée à "✅ Réalisé".
- `docs/v1/data-model.md` : annotations "⚑ Lot 4" sur `Organization`,
  `Client`, ajout des modèles `Invoice`/`InvoiceLine`/`Payment` avec
  écarts documentés par rapport au plan initial.
- Déplacement `modules/quotes/calc.ts` → `lib/billing/calc.ts` (partagé
  Devis/Facture, tous les importeurs mis à jour).
- `TENANT_SCOPED_MODELS` étendu à `Invoice`/`InvoiceLine`/`Payment`.
- `prisma/rls.sql` étendu (policies + 5 nouveaux triggers d'immutabilité/
  suppression) et corrigé rétroactivement pour un gap trouvé sur les
  devis (`quotes_forbid_delete_issued` manquait — une facture… un devis
  émis était supprimable, seule l'UPDATE était bloquée).

## 22. Verdict

**Peut-on lancer le Lot 5 — Cockpit financier + Trésorerie
opérationnelle : OUI.**

Sous les mêmes réserves qu'aux lots précédents (protocole de validation
cloud à exécuter avant mise en production réelle) et sous réserve des
points juridiques §18 (mentions légales complètes à faire valider par un
expert avant tout usage réel facturant de vrais clients).

Invariants que le Lot 5 doit conserver (en plus de ceux des Lots 0-3,
toujours valables) :

1. Le calculateur financier (`lib/billing/calc.ts`) reste l'unique
   source de vérité des montants Devis **et** Facture — jamais un
   troisième moteur de calcul pour la trésorerie.
2. `Invoice.status` reste `draft`/`issued` uniquement ; le statut de
   paiement reste **dérivé**, jamais stocké comme une troisième vérité
   (ADR-19) — la trésorerie du Lot 5 doit lire les `Payment` actifs, pas
   introduire un nouvel agrégat parallèle.
3. Une facture émise reste immuable au niveau base de données (trigger),
   jamais seulement applicatif ; un `Payment` enregistré reste un fait
   traçable — jamais supprimé, seulement annulable.
4. Toute nouvelle agrégation financière (prévisionnel de trésorerie,
   etc.) doit avoir une **définition explicite et documentée**, comme
   `billedCents`/`outstandingCents`/`overdueCents`/`collectedCents` —
   jamais un chiffre ambigu, jamais nommé "chiffre d'affaires" sans
   définition comptable/fiscale établie.
5. La concurrence sur les écritures financières (paiements, émission)
   reste testée sous charge réelle, pas seulement unitairement — tout
   nouveau point d'écriture concurrente introduit par le Lot 5 doit
   avoir son propre test de concurrence bloquant.
6. Les 230 tests actuels (Lots 0-4) restent verts et bloquants,
   `VALIDATION CLOUD REQUISE` reste affiché tant qu'un vrai projet
   Supabase n'a pas été testé selon le protocole documenté.
7. La correction par avoir reste hors périmètre tant qu'elle n'est pas
   explicitement demandée — le Lot 5 ne doit pas improviser une mutation
   d'une facture émise pour les besoins de la trésorerie.
