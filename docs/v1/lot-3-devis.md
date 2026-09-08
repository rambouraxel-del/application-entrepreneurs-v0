# Lot 3 — Devis (compte rendu)

> Suite du Lot 2 (`lot-2-clients-dashboard.md`). Premier workflow commercial
> financier réel de la V1 : Client → Devis. Toujours pas de facture — le
> Lot 4 construira `Devis accepté → Facture` sur un vrai modèle `Invoice`.

---

## 1. Résumé

Un utilisateur authentifié peut : créer un devis brouillon pour un client
réel, ajouter/modifier/supprimer des lignes avec calcul en direct, émettre le
devis (numéro fiable, snapshots figés, montants recalculés serveur), suivre
son statut (envoyé/accepté/refusé/expiré), télécharger son PDF, le retrouver
depuis la fiche Client, et voir le Dashboard/moteur d'insights réagir à de
vrais devis (aucune donnée financière fictive — pas de CA, pas de facture).

## 2. Modèle Devis

`Quote` : `id, organizationId, clientId, number?, status, issuedAt?,
validUntil?, notes?, clientSnapshot?, organizationSnapshot?, totalHtCents,
totalVatCents, totalTtcCents, vatBreakdown, pdfPath?, pdfSha256?, createdAt,
updatedAt`.

`QuoteLine` : `id, organizationId (dénormalisé), quoteId, position,
description, unit?, quantityMilli, unitPriceCents, vatRateBp, discountBp,
grossHtCents, discountCents, netHtCents, vatCents, totalTtcCents, createdAt,
updatedAt`.

Écarts assumés par rapport à `docs/v1/data-model.md` (ADR-17/18) :
- `quantity` en `Int` (millièmes entiers) plutôt que `Decimal(12,3)` — reste
  dans l'arithmétique entière BigInt validée au Lot 0, évite le type Prisma
  `Decimal`.
- Pas de `payment_terms` séparé (fondu dans `notes`), pas encore de
  `converted_invoice_id` (Lot 4).
- `organizationId` dénormalisé sur `QuoteLine` (absent du modèle
  `data-model.md`) pour porter la même policy RLS simple que `clients`/`tasks`.

Catalogue Produits/Services : **pas construit** (hors P0, `docs/mvp-commercial.md`).
Les lignes sont entièrement libres — aucun blocage pour un futur catalogue :
un `productId` optionnel pourra être ajouté à `QuoteLine` sans rien casser.

## 3. Calcul financier

Module pur `src/modules/quotes/calc.ts`, **porté sans modification** depuis
le spike Lot 0 (`v1-spike/src/money/money.ts`) : arithmétique entière BigInt,
montants en centimes, quantités en millièmes, taux en points de base — aucun
flottant dans le chemin de calcul. Ordre d'arrondi identique à la V0 :
`brut = round(qté × PU)` → `remise = round(brut × taux)` → `net = brut − remise`
→ `TVA = round(net × taux)` → `TTC = net + TVA`, arrondi **half-up** au
centime à chaque étape nommée.

**Une seule fonction `roundToCents` interne** (`divRoundHalfUp`). Les totaux
de document sont la **somme des lignes déjà arrondies**, jamais un recalcul
par formule — garantit que l'écran, le service et le PDF affichent le même
chiffre au centime près. Le navigateur peut afficher un total en direct pour
l'UX (JS côté client, cf. §8), mais **chaque sauvegarde et l'émission
recalculent tout côté serveur** à partir des lignes stockées — jamais une
valeur transmise par le formulaire.

19 tests unitaires (`tests/calc.test.ts`) : 0,1+0,2 (aucune erreur de
flottant possible, tout est entier dès la frontière de saisie), quantité ×
prix, TVA 0/5,5/10/20 %, plusieurs lignes, remise, arrondis produisant des
demi-centimes (half-up vérifié explicitement), zéro, vingt lignes
(indépendance à l'ordre), valeur limite haute, déterminisme (même entrée →
même sortie, à l'octet près).

## 4. Statuts — machine d'état

`draft → sent → {accepted | rejected | expired}`. Transitions autorisées
uniquement depuis `sent` — pas de retour en arrière, pas de double
transition. Appliqué à la fois côté service (`assertSent`) et **en base**
(trigger `quotes_protect_issued`, voir §12).

`expired` est une transition **manuelle** (bouton "Marquer expiré"), pas un
job planifié — le Lot 3 n'introduit ni Redis ni tâche de fond
(docs/v1/lot-3-devis.md §37/§10 des consignes). L'insight "proche
expiration" (§10) sert de rappel visuel ; rien ne force le statut
automatiquement.

## 5. Émission — transaction

`quotes/service.ts::emitQuote` (docs/v1/architecture.md §16) :
1. vérifie que le devis est un brouillon avec au moins une ligne ;
2. **recalcule les montants côté serveur** à partir des lignes réellement en
   base (`computeDocumentTotals`), jamais une valeur transmise ;
3. charge Client + Organization, construit les snapshots ;
4. alloue le numéro (compteur transactionnel, §6) ;
5. une seule instruction `UPDATE` fige `number/status/issuedAt/snapshots/totaux` ;
6. commit — ou rollback complet à la moindre erreur (testé, §12).

Le PDF est généré et stocké **après** le commit (I/O non transactionnel) :
un échec de rendu n'invalide pas l'émission (numéro déjà alloué, légalement
acquis) — régénérable via une action dédiée (`regeneratePdfAction`).
`pdfPath`/`pdfSha256` sont explicitement exemptés du trigger d'immutabilité
pour permettre cette mise à jour a posteriori.

## 6. Numérotation

Mécanisme validé au Lot 0, **porté sans modification**
(`src/lib/numbering/allocate.ts`) : `INSERT ... ON CONFLICT DO UPDATE SET
last_value = last_value + 1 RETURNING`, dans la transaction d'émission —
jamais `MAX+1`/`COUNT+1`. Format `DEV-{année}-{6 chiffres}`, strictement
séparé de la valeur métier (jamais parsé).

**Test de concurrence réel, bloquant** (`tests/numbering.test.ts`) : 50
allocations simultanées sur le vrai modèle `document_counters` → 50 valeurs
strictement uniques et consécutives (1..50, sans trou), compteur final
cohérent. Isolation vérifiée : la concurrence sur l'organisation A ne fuit
jamais vers le compteur de B. Rollback vérifié : une transaction qui échoue
après allocation laisse le compteur inchangé, la prochaine allocation
réutilise la valeur (séquence sans trou garantie).

## 7. Multi-tenancy

`Quote`/`QuoteLine` ajoutés à l'extension Prisma (garde-fou) et à la RLS
(`prisma/rls.sql`, policy `tenant_isolation` identique à `clients`/`tasks` :
organisation ET appartenance réelle). `DocumentCounter` scopé de la même
façon.

**Point critique testé explicitement** (`tests/quotes.test.ts`) : A ne peut
JAMAIS créer un devis pour le Client de B, même en connaissant son UUID —
vérifié côté service (`assertClientBelongsToOrg`, réutilisé de
`clients/service.ts`) avant toute écriture, pas seulement par la RLS.
Complet : A ne voit pas les devis de B, ne peut ni les lire, ni les
modifier, ni y ajouter de ligne ; une insertion SQL brute visant
l'organisation de B (devis ou ligne) est refusée par la RLS.

## 8. UI

- **Liste** (`/app/quotes`) : filtre par statut, cartes responsives (jamais
  un tableau desktop compressé sur mobile), numéro/brouillon, client,
  montant TTC, statut, validité.
- **Création** (`/app/quotes/new`) : choix du client → brouillon créé →
  redirection vers la fiche pour ajouter les lignes.
- **Fiche devis** (`/app/quotes/[id]`) : lignes éditables (ajout/modification/
  suppression) tant que brouillon, totaux HT/TVA (par taux)/TTC, actions
  selon statut (Émettre/Supprimer en brouillon ; Accepter/Refuser/Marquer
  expiré en envoyé), téléchargement PDF. Pas de bouton "Transformer en
  facture" — réservé au Lot 4, aucun bouton factice affiché.
- **Fiche Client** : section "Devis" listant les devis récents (numéro,
  montant, statut), lien vers chacun.
- Formulaire de ligne : TVA via une liste fermée (0/5,5/10/20 %) plutôt qu'un
  champ libre — évite les erreurs de saisie de taux.

## 9. Dashboard

`getDashboardSnapshot` étendu (toujours une seule fonction serveur, aucune
requête séparée côté client) :
- **Ma situation** : devis en cours (envoyés), valeur cumulée des devis
  ouverts — **jamais un CA** (aucune facture n'existe encore).
- **À surveiller** : devis envoyés sans réponse depuis plus longtemps que le
  seuil configuré, devis proches de leur date de validité.
- **Opportunités** : devis ouverts à forte valeur.

## 10. Insights

3 nouvelles règles (`src/modules/insights/rules.ts`), même moteur pur que le
Lot 2 :

| Règle | Condition | Type / priorité |
|---|---|---|
| `quoteAwaitingResponse` | envoyé, âge ≥ `Organization.quoteFollowUpDays` | `alert` / `high` |
| `quoteNearExpiry` | envoyé, `validUntil` dans les 7 prochains jours (fixe, ⚑ hypothèse) | `alert` / `high` |
| `quoteHighValue` | envoyé, montant TTC ≥ `Organization.quoteHighValueCents` | `opportunity` / `normal` |

Aucune règle facture — elle n'existe pas encore.

## 11. Cloud

**Statut inchangé depuis le Lot 1/2 : VALIDATION CLOUD REQUISE.** Aucun
credential Supabase disponible dans cet environnement pour le Lot 3 non
plus. Le protocole de validation manuelle (`lot-1-socle.md` §13) reste à
exécuter avant toute mise en production ; le métier Devis n'a pas été
bloqué par cette limite, conformément à la consigne du Lot 3.

## 12. Tests

**158 tests Vitest**, tous verts, contre une vraie base PostgreSQL locale :

- `tests/calc.test.ts` (19) : moteur financier, voir §3.
- `tests/numbering.test.ts` (10) : formatage, séquentialité, isolation par
  organisation/type/année, **50 émissions concurrentes sans collision**,
  rollback.
- `tests/quotes.test.ts` (31) : création/lecture, lignes (ajout/modification/
  suppression/validation), émission (numéro, snapshots, refus sans ligne,
  refus de ré-émission, séquence sans trou), **immutabilité** (modifier le
  Client après émission ne change pas le snapshot ; toute mutation directe
  hors statut/PDF refusée par la base ; lignes figées ; suppression
  impossible ; pas de demi-état après une mutation refusée), statuts
  (transitions valides/invalides), isolation multi-tenant complète.
- `tests/insights.test.ts` (36, +13 pour les règles devis) : déclenchement,
  non-déclenchement, limites exactes (seuil, veille du seuil, jour même de
  l'expiration), absence de données.
- `tests/dashboard.test.ts` (9, +4) : comptage devis ouverts et valeur
  cumulée (jamais un CA), devis forte valeur/sans réponse dans les
  insights, aucune fuite d'un devis de B.
- Suites héritées inchangées et toujours vertes : `isolation` (18),
  `clients` (15), `tasks` (14), `organizations` (6).

Lint, typecheck, build : tous verts. Tests V0 (racine du dépôt) : 6/6
toujours verts, V0 inchangée.

Non couvert automatiquement : parcours E2E authentifié (Supabase cloud
indisponible dans cet environnement, voir §11) — non contourné, documenté
honnêtement plutôt que simulé (docs/v1/lot-3-devis.md, consigne §35).
Capture visuelle mobile réelle : même limite (pages `/app/*` exigent une
session Supabase valide) — vérification faite par revue de code (Tailwind
responsive, cartes empilées, formulaire de ligne en grille adaptative).

## 13. Hypothèses / points juridiques ouverts

Aucun test utilisateur conduit sur la V1. Hypothèses réversibles :
- Les 5 statuts devis et leurs transitions.
- Le seuil fixe "proche expiration" (7 jours, non configurable) — pourrait
  devenir un réglage si un besoin réel apparaît.
- Les seuils par défaut `quoteFollowUpDays` (7 j) et `quoteHighValueCents`
  (5000 €).
- Le format de numéro `DEV-{année}-{6 chiffres}` et son wording.

⚑ **À VALIDER JURIDIQUEMENT** :
- `organizationSnapshot` ne contient que ce qui existe réellement dans
  `Organization` aujourd'hui (nom) — pas de SIRET, pas d'adresse légale
  (hors périmètre Lot 1-3). Les mentions légales complètes d'un devis
  français restent à vérifier avant tout usage réel.
- Ce compte rendu **ne généralise pas** les obligations légales de
  numérotation des factures aux devis : le mécanisme robuste du Lot 0 est
  réutilisé pour la cohérence produit (un seul système de numérotation),
  pas parce qu'une obligation légale de numérotation séquentielle des devis
  aurait été vérifiée.

## 14. Limites

- Pas de catalogue Produits/Services (hors P0, volontaire) — lignes
  entièrement libres.
- Pas de versions multiples de devis, pas de signature électronique, pas de
  paiement en ligne, pas de workflow d'approbation (hors périmètre Lot 3).
- `Organization` ne porte pas encore d'identité légale complète (voir §13).
- E2E authentifié et capture mobile réelle non exécutés (cloud requis, voir
  §12).
- La garde de revue sur `systemDb` (Lot 1) couvre aussi `prisma/seed.ts`,
  qui reproduit manuellement les étapes d'émission pour dater des devis de
  démonstration dans le passé — nécessaire car le trigger d'immutabilité
  empêche de "vieillir" un devis déjà émis après coup (comportement voulu,
  documenté dans `prisma/seed.ts`).

## 15. Verdict

**Peut-on lancer le Lot 4 — Factures + Paiements réels : OUI.**

Sous la même réserve qu'aux lots précédents (protocole de validation cloud
à exécuter avant mise en production réelle) et sous réserve du point
juridique §13 (identité légale de l'Organization à compléter avant
d'émettre de vraies factures).

Invariants que le Lot 4 doit conserver (en plus de ceux des Lots 0-2,
toujours valables) :

1. Le calculateur financier (`quotes/calc.ts`) reste l'unique source de
   vérité des montants — une future facture le réutilise tel quel, jamais
   une deuxième implémentation du calcul.
2. La numérotation (`lib/numbering/allocate.ts`, `document_counters`) est
   déjà générique (`docType`) — le Lot 4 l'utilise telle quelle pour les
   factures (`docType: 'invoice'`), jamais un nouveau mécanisme.
3. Toute nouvelle table métier "émise/figée" (Invoice) reçoit le même
   trigger d'immutabilité en base (pas seulement une discipline
   applicative) — voir `quotes_protect_issued`/`quotes_forbid_delete_issued`
   comme modèle direct.
4. La transformation Devis accepté → Facture doit rester une transaction
   unique (lecture du devis → création facture brouillon avec copie des
   lignes/snapshots → lien `quote_id` unique) — jamais deux écritures
   séparées.
5. Aucune donnée financière n'apparaît dans l'UI tant qu'elle n'est pas
   réelle (pas de CA avant qu'une vraie facture existe).
6. Les 158 tests actuels (Lots 0-3) restent verts et bloquants en CI,
   `VALIDATION CLOUD REQUISE` reste affiché tant qu'un vrai projet Supabase
   n'a pas été testé selon le protocole documenté.
7. `Organization` doit être enrichie (SIRET, adresse légale) **avant**
   d'émettre une vraie facture — la mention "⚑ À VALIDER JURIDIQUEMENT" du
   §13 doit être levée, pas contournée.
