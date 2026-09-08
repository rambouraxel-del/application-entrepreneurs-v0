# Architecture technique V1 — Cockpit Entrepreneur

> **Source de vérité technique de la V1.** Périmètre fonctionnel de référence : `docs/mvp-commercial.md`. Vision produit : `docs/positionnement-produit.md`. Règles décisionnelles : `docs/insights-engine.md`.
>
> Documents liés : [`data-model.md`](data-model.md) · [`security.md`](security.md) · [`migration-v0-v1.md`](migration-v0-v1.md) · [`lot-0-validation.md`](lot-0-validation.md)
>
> **Éprouvée par le Lot 0** : les décisions marquées ⚑ ont été modifiées à la suite de tests réellement exécutés (voir `lot-0-validation.md`).
>
> **Statut : conception validée à relire — aucune ligne de V1 n'est écrite.** Ce document doit permettre à un développeur qui n'a pas participé à la V0 de savoir quoi construire, comment, pourquoi, et quelles règles ne jamais violer.

---

## 1. En une page

Cockpit Entrepreneur V1 est un **SaaS B2B français multi-tenant**, construit comme un **monolithe modulaire Next.js/TypeScript sur PostgreSQL**, hébergé sur Vercel, avec Supabase (base + authentification + stockage) et Stripe (abonnement).

Trois invariants gouvernent toute l'architecture. Ils priment sur la vitesse de développement :

1. **Isolation multi-tenant** — une requête d'un utilisateur de l'organisation A ne doit jamais pouvoir lire ou écrire une donnée de B. Garantie structurellement (accès aux données scopé automatiquement), pas par vigilance.
2. **Exactitude de l'argent** — les montants sont des entiers en centimes, jamais des flottants. Une facture émise ne change plus jamais, quoi qu'il arrive aux données dont elle est issue.
3. **Le cockpit reste déterministe** — le moteur d'insights est une fonction pure, testable et explicable. Aucune IA n'est nécessaire à son fonctionnement.

Tout le reste (choix de framework, d'hébergeur, de fournisseur d'e-mail) est remplaçable sans réécrire le cœur métier.

---

## 2. Ce que la V0 lègue à la V1

Constats issus de l'audit du dépôt (`js/app.js` 11 628 lignes, 6 moteurs de calcul, 1 moteur d'insights, 17 pages).

| Élément V0 | Verdict | Raison |
|---|---|---|
| Moteur d'insights (`js/insights-engine.js`) | **Porté quasi littéralement** | Déjà une fonction pure `compute(context)` sans DOM, avec ses tests. Meilleur actif technique du projet. |
| Règles de calcul devis/factures (séquence remise → HT → TVA → TTC, TVA par taux) | **Portées comme spécification** | Sémantique métier validée ; l'implémentation change (centimes entiers). |
| Snapshots documentaires (`clientSnapshot`, `companySnapshot` figés à l'émission) | **Concept porté tel quel** | La V0 a déjà la bonne intuition d'immutabilité. |
| Statut de facture calculé (`computeStatutAffiche`) | **Concept porté** | Statut dérivé des faits, jamais stocké en double. |
| Hiérarchie du Dashboard en 5 niveaux, wording, charte graphique | **Réutilisés comme spécification produit/UX** | Résultat de 3 itérations produit ; aucune raison de le rejouer. |
| `Math.round(v * 100) / 100` sur des flottants | **Abandonné** | Source d'erreurs de centimes ; remplacé par des entiers (§8). |
| Numérotation `MAX(numéro) + 1` en mémoire | **Abandonné** | Non fiable en concurrence, produit des trous et des doublons (§9). |
| Architecture IIFE + singletons `window.COCKPIT_*` | **Abandonnée** | Aucun typage, aucune frontière, non testable hors navigateur. |
| Données métier en dur dans le HTML (tableaux de `pages/*.html`) | **Abandonnées** | Remplacées par des requêtes sur la base. |
| `localStorage` comme stockage de configuration | **Abandonné** | La configuration devient une table par organisation. |
| Centre de paramètres à 14 sections | **Fortement réduit** | Le MVP ne retient que : entreprise, objectifs, seuils d'alertes. |

Décision de stratégie de migration : **nouvelle application construite à côté**, pas refactoring progressif de la V0. Justification détaillée dans [`migration-v0-v1.md`](migration-v0-v1.md).

---

## 3. Stack retenue

Critères appliqués : très petite équipe, développement fortement assisté par Claude Code, itérations rapides, SaaS B2B français, données sensibles, multi-tenant, coût de départ faible, maintenabilité par un tiers.

| Besoin | Retenu | Rôle | Justification | Alternative sérieuse écartée |
|---|---|---|---|---|
| **Frontend + Backend** | **Next.js (App Router) + TypeScript** | Application unique : rendu serveur, UI, actions serveur | Un seul dépôt, un seul langage, un seul déploiement. Server Components + Server Actions suppriment une couche d'API à écrire à la main. Corpus de documentation immense → très efficace en développement assisté. Compatible PWA plus tard. | **Ruby on Rails / Laravel** : excellent pour un monolithe solo, mais nous obligerait à réécrire dans un autre langage les règles métier et le moteur d'insights déjà écrits en JS, et à maintenir deux langages. — **SPA Vite + API séparée (NestJS/Fastify)** : deux déploiements, deux frontières de types, plus de code pour zéro bénéfice MVP. |
| **Base de données** | **PostgreSQL managé (Supabase)** | Stockage de toutes les données métier | Intégrité relationnelle, transactions, contraintes, types exacts pour l'argent, verrous de ligne pour la numérotation, RLS disponible en défense en profondeur. Choix par défaut incontestable pour un domaine financier relationnel. | **MySQL/PlanetScale** : historiquement sans clés étrangères, moins adapté à nos contraintes d'intégrité. — **MongoDB** : rejeté d'emblée, domaine profondément relationnel et financier. — **SQLite/Turso** : séduisant et peu coûteux, mais Postgres managé offre sauvegardes, branches et RLS sans effort. |
| **Accès aux données** | **Prisma** | Schéma, migrations, client typé | Le fichier `schema.prisma` est une source de vérité lisible, y compris par un non-développeur ; migrations versionnées de première classe ; extensions client permettant d'imposer le filtrage par tenant (§6). | **Drizzle** : plus léger et plus proche du SQL, mais outillage de migration moins guidé et corpus plus restreint pour une équipe débutante. |
| **Authentification** | **Supabase Auth** (déléguée) | Inscription, connexion, réinitialisation, vérification e-mail, sessions | On ne code pas soi-même le hachage de mots de passe ni les flux de réinitialisation. Même fournisseur que la base, région UE, palier gratuit généreux, l'identité reste dans notre Postgres. | **Clerk** : meilleure ergonomie, mais troisième fournisseur et résidence des données hors UE par défaut, discutable pour un B2B français. — **Auth.js/NextAuth en « credentials »** : gratuit mais nous rendrait à nouveau responsables du hachage et des flux sensibles. — **Auth maison** : écartée, risque de sécurité disproportionné. |
| **Stockage de fichiers** | **Supabase Storage** | PDF de documents, logo | Compatible S3, URLs signées, même fournisseur et même région que la base, rattachement naturel par tenant. | **Cloudflare R2 / AWS S3** : excellents, mais un fournisseur de plus sans bénéfice à notre volume. |
| **Génération PDF** | **`@react-pdf/renderer` côté serveur** | Devis et factures PDF | Pur JavaScript, sans navigateur headless : démarrages à froid rapides, sortie déterministe, testable. La V0 possède déjà des gabarits d'impression distincts : un gabarit PDF dédié est cohérent avec ce choix. | **Chromium headless (Puppeteer) « print to PDF »** : rendu identique à la page web, mais lourd et fragile en environnement serverless. — **Service auto-hébergé (Gotenberg)** : infrastructure supplémentaire à exploiter. |
| **E-mail transactionnel** | **Resend** | Envoi de devis/factures, réinitialisation, notifications de compte | API simple, gabarits en React, bonne délivrabilité, intégration naturelle avec la stack. | **Brevo** (éditeur français, à privilégier si la résidence UE devient une exigence commerciale) — **Postmark** (excellente délivrabilité, plus cher) — **AWS SES** (le moins cher, le plus de configuration). |
| **Abonnement** | **Stripe Billing** (Checkout + Customer Portal) | Paiement récurrent, moyens de paiement, factures d'abonnement | Standard de fait, gère carte et SEPA, portail client prêt à l'emploi : nous n'écrivons aucune interface de facturation SaaS. | Aucune alternative sérieuse pour un SaaS français à ce stade. |
| **Hébergement** | **Vercel** | Exécution de l'application, déploiements de préversion par PR | Intégration native Next.js, préversions automatiques par pull request, coût de départ nul. | **Scaleway / Clever Cloud / Fly.io** : à privilégier si la souveraineté UE devient une exigence de vente. Next.js s'exécute sur n'importe quel hébergeur Node : la porte de sortie reste ouverte (§14). |
| **Observabilité** | **Sentry** + logs Vercel + sonde de disponibilité (BetterStack/UptimeRobot) | Erreurs front et back, journalisation, disponibilité | Deux outils suffisent à une petite équipe ; Sentry couvre les deux côtés avec le même projet. | Stack d'observabilité complète (Grafana/Loki) : disproportionnée. |
| **Tests** | **Vitest** (unitaire + intégration) et **Playwright** (bout en bout) | Filet de sécurité | Vitest est natif TypeScript et rapide ; Playwright est le standard pour les parcours critiques. | Jest : plus lent, configuration TypeScript plus pénible. |

**Ce que nous n'introduisons pas au MVP** — et il faut une justification écrite pour revenir dessus : file d'attente (Redis/BullMQ), cache applicatif, moteur de recherche, GraphQL, ORM secondaire, micro-frontends, Docker en production, Kubernetes, bus d'événements.

---

## 4. Forme générale : monolithe modulaire — confirmé

L'hypothèse de départ est confirmée. **Une application, une base, un déploiement.**

Justification chiffrée : la cible est composée d'entreprises de 1 à 10 personnes ; une organisation active génère de l'ordre de quelques centaines de clients, devis, factures et mouvements — pas des millions. Aucune contrainte de charge, de scalabilité indépendante ou d'équipe multiple ne justifie de distribuer le système. Microservices, event sourcing, CQRS et infrastructure distribuée sont **explicitement écartés** : ils multiplieraient le coût d'exploitation et la surface de bug pour zéro bénéfice, et rendraient le produit incompréhensible pour une équipe réduite.

Les frontières existent quand même — mais elles sont **des dossiers et des interfaces explicites, pas des services réseau**.

### 4.1 Modules

| Module | Responsabilité | Dépendances autorisées |
|---|---|---|
| `auth` | Session, cycle de vie du compte, appartenance à une organisation | — |
| `organization` | Organisation (tenant), informations légales de l'entreprise, paramètres, objectifs, seuils | `auth` |
| `clients` | Fiche client, statut, dernier contact | `organization` |
| `catalog` | Catalogue produits/services (P1 dans le MVP) | `organization` |
| `activities` | Rendez-vous / actions commerciales **et** tâches — deux entités, une frontière, car elles alimentent la même lecture (« mes priorités du jour ») | `organization`, `clients` |
| `quotes` | Devis, lignes, statuts, transformation en facture | `organization`, `clients`, `catalog`, `numbering`, `documents` |
| `invoices` | Factures, lignes, **paiements** (ils n'existent jamais sans facture), échéances, statut dérivé | `organization`, `clients`, `quotes`, `numbering`, `documents` |
| `cash` | Trésorerie opérationnelle : mouvements saisis, solde, projection | `organization`, `invoices` (encaissements) |
| `numbering` | Allocation transactionnelle de numéros de documents | — (service technique) |
| `insights` | Assemblage du contexte + **moteur pur** de règles décisionnelles | Lecture seule sur `clients`, `activities`, `quotes`, `invoices`, `cash`, `organization` |
| `documents` | Génération PDF, stockage, métadonnées, URLs signées | `organization` |
| `billing` | Abonnement Stripe, état d'accès au produit | `organization` |
| `notifications` | Envoi d'e-mails transactionnels | `organization` |
| `einvoicing` | **Port** de transmission réglementaire + adaptateur fournisseur (§13) | `invoices` (par interface uniquement) |

**Règles de dépendance à ne pas violer :**

- Un module n'importe jamais le *repository* d'un autre module : il passe par le service exposé par ce module (`clients/service.ts`), jamais par sa couche d'accès aux données.
- `insights` est en **lecture seule** : il ne modifie rien, jamais.
- Le cœur métier (`quotes`, `invoices`) n'importe **aucun SDK de fournisseur externe**. Stripe, Resend, la plateforme de facturation électronique sont atteints via des interfaces définies par le module appelant et implémentées dans `integrations/`.
- Aucune dépendance circulaire. Si deux modules ont besoin l'un de l'autre, c'est qu'une frontière est mal placée.

---

## 5. Style d'API et découpage applicatif

**Décision : Server Actions et Server Components comme mode principal (style RPC), avec une surface REST minimale réservée aux appels machine.**

- **Server Components** pour la lecture : chaque page charge ses données côté serveur, sans API intermédiaire ni état client à synchroniser.
- **Server Actions** pour l'écriture : création/modification/suppression, avec types de bout en bout et sans génération de code.
- **Route handlers REST**, uniquement là où une URL est indispensable :
  - `POST /api/webhooks/stripe` — webhooks d'abonnement ;
  - `GET /api/documents/:id/download` — téléchargement de PDF via URL signée ;
  - `POST /api/webhooks/einvoicing/:provider` — retours de la plateforme de facturation électronique (à activer avec l'intégration réelle) ;
  - une base pour une future application mobile/PWA, si elle arrive.

GraphQL est écarté : un seul client connu, aucun besoin de requêtes composées par le consommateur, et un coût d'outillage réel. Une API REST complète comme mode principal est écartée : elle doublerait la quantité de code pour un bénéfice nul au MVP.

**Règle d'architecture majeure : une Server Action est un point d'entrée, jamais de la logique métier.** Chaque action suit exactement cette séquence :

```
Server Action
  1. valider l'entrée               (schéma Zod, côté serveur, toujours)
  2. résoudre le contexte tenant    (session → { userId, organizationId })
  3. vérifier l'accès               (abonnement actif, appartenance)
  4. appeler le service du module   ← toute la logique métier est ici
  5. renvoyer un résultat typé      (succès | erreur métier nommée)
```

Trois couches par module, et pas une de plus :

| Couche | Fichier type | Rôle | Interdits |
|---|---|---|---|
| **Actions / routes** | `modules/invoices/actions.ts` | Validation, contexte, traduction des erreurs | Aucun calcul métier, aucun accès direct à la base |
| **Service** | `modules/invoices/service.ts` | Règles métier, transactions, orchestration | Aucun objet Request/Response, aucun JSX |
| **Repository** | `modules/invoices/repository.ts` | Requêtes Prisma scopées par tenant | Aucune règle métier |
| *(+ pur)* | `modules/invoices/calc.ts` | Fonctions pures : totaux, TVA, statut | Aucune E/S, aucune date « maintenant » implicite |

Les fonctions pures (`calc.ts`, moteur d'insights) reçoivent toujours la date de référence en paramètre — jamais `new Date()` à l'intérieur — afin de rester testables de façon déterministe. C'est déjà la convention adoptée en V0.13 pour le moteur d'insights ; elle est généralisée.

### 5.1 Gestion des erreurs

- **Erreurs métier attendues** (facture déjà émise, devis déjà transformé, montant invalide) : type de retour explicite, jamais une exception. Message affichable en français, code stable pour les tests.
- **Erreurs techniques** : exception, capturée par la frontière de rendu, journalisée dans Sentry avec l'`organizationId` mais **sans donnée personnelle ni montant**, affichée à l'utilisateur comme un message générique avec un identifiant de corrélation.
- **Jamais de page blanche** : chaque segment de route a une frontière d'erreur ; le Dashboard se dégrade bloc par bloc (un niveau en erreur n'empêche pas les quatre autres de s'afficher).

### 5.2 Travaux asynchrones — volontairement absents

Le MVP **n'a pas de file d'attente ni d'ordonnanceur**. C'est une couche entière retirée :

- l'envoi d'e-mail est effectué dans la requête, son résultat est enregistré (`sent | failed`), et un échec est rejouable manuellement depuis l'interface ;
- le PDF est généré au moment de l'émission, de façon synchrone ;
- les insights sont calculés à la demande (§11).

Si un besoin réellement asynchrone apparaît (relances automatiques, transmission e-invoicing par lots), la première réponse sera une **table de tâches en base + une route déclenchée par Vercel Cron**, pas Redis. Introduire une infrastructure de file d'attente demandera une décision écrite.

---

## 6. Multi-tenant — point critique

**Modèle : une base, un schéma, une colonne `organization_id` sur toute donnée métier.** Une base par client est écartée (coût d'exploitation et de migration disproportionné pour des TPE) ; un schéma Postgres par client également.

### 6.1 Les cinq mécanismes, du plus structurel au plus vigilant

1. **Schéma** — toute table métier porte `organization_id NOT NULL` avec clé étrangère et index. Les unicités sont **composites et scopées** : `UNIQUE (organization_id, invoice_number)`, jamais `UNIQUE (invoice_number)`. Aucune table métier n'a d'identifiant deviné publiquement : les clés primaires sont des UUID (une URL devinée ne révèle rien, et une fuite d'identifiant ne suffit pas puisque le filtrage s'applique quand même).

2. **Contexte de requête obligatoire** — la session résout un `TenantContext { userId, organizationId }`. Toute fonction de repository prend ce contexte en **premier argument**. Une fonction de repository sans contexte tenant est un bug de revue de code.

3. **Filtrage automatique, pas manuel** — le client Prisma est enveloppé par une **extension** qui, pour tout modèle marqué « scopé tenant » :
   - injecte `where: { organizationId }` sur `findMany`, `findFirst`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate` ;
   - impose `organizationId` sur `create` ;
   - **échoue bruyamment** si aucun contexte tenant n'est présent.
   Le client Prisma brut n'est accessible que depuis un module `db/system.ts` nommé explicitement (migrations, tâches système, webhooks Stripe qui résolvent l'organisation par l'identifiant client Stripe). Toute importation de `db/system.ts` hors de ces chemins est signalée par une règle de lint.

   ⚑ **Trois rôles PostgreSQL, pas deux** (Lot 0) : `FORCE ROW LEVEL SECURITY` — indispensable, sans quoi le propriétaire des tables échappe aux policies — bloque aussi le propriétaire. Or l'inscription crée une organisation *avant* qu'un contexte tenant existe. Il faut donc un **rôle système `BYPASSRLS`** distinct du propriétaire (DDL) et du rôle applicatif. C'est l'unique porte de sortie de la RLS ; elle reste confinée à `db/system.ts`.

4. **Vérification d'appartenance, aux deux bouts** — l'`organizationId` ne provient **jamais** d'un paramètre de requête, d'un champ de formulaire ou d'une URL : il est dérivé de la session côté serveur. ⚑ Le Lot 0 a montré que cela ne suffit pas : un contexte tenant **fabriqué en code** (utilisateur de A, organisation de B) traversait extension *et* RLS, parce qu'une policy « `organization_id = organisation courante` » **confine** la requête sans **autoriser** l'utilisateur. Deux corrections, testées : la policy exige aussi une appartenance réelle (`AND app_is_member(organization_id)`), et `TenantContext` est un **type marqué** dont le seul producteur est le résolveur qui vérifie l'appartenance — un contexte fabriqué à la main ne compile pas.

5. ⚑ **Row Level Security — active dès le premier jour, pas un durcissement.** *Décision révisée par le Lot 0.* L'architecture initiale la reportait ; les tests ont montré que l'extension Prisma **n'intercepte ni le SQL brut, ni les relations imbriquées (`include`), ni les modèles hors de son périmètre** — trois cas parfaitement ordinaires où la RLS est la **seule** protection. La reporter aurait laissé ces trous ouverts en production.
   **Décision : RLS activée en même temps que la première table métier du Lot 1**, avec `ENABLE` + `FORCE ROW LEVEL SECURITY` et une policy exigeant **concordance d'organisation ET appartenance**.
   Le contexte est transmis par `set_config('app.organization_id', $1, true)` — portée **transaction**, donc annulée au COMMIT comme au ROLLBACK : impossible à faire fuiter entre deux requêtes via une connexion recyclée par le pool. `SET` de portée session est **proscrit** pour cette raison exacte, et `SET LOCAL x = '…'` l'est aussi car il n'accepte pas de paramètre lié (concaténation = injection SQL). Coût mesuré : deux `set_config` par transaction et des policies de trois lignes.

### 6.2 Conséquences sur les tests — non négociable

Une suite de tests dédiée `isolation.spec.ts` est **bloquante en intégration continue** :

- pour **chaque** modèle scopé tenant, deux organisations sont créées avec des données ; le contexte de A doit renvoyer zéro ligne de B en lecture, et échouer en modification et en suppression sur une ligne de B ;
- un test de garde vérifie qu'aucun modèle métier n'a été ajouté sans `organization_id` (parcours du schéma Prisma) — ainsi, ajouter une table sans la scoper fait échouer la CI ;
- un test vérifie qu'aucun fichier hors de la liste blanche n'importe le client brut.

C'est le filet qui transforme « on fait attention » en garantie.

### 6.3 Un utilisateur, plusieurs organisations — préparé, pas construit

La table de liaison **`memberships (user_id, organization_id, role)` existe dès le premier jour**, même si l'interface du MVP ne crée jamais qu'une appartenance par utilisateur. Coût quasi nul aujourd'hui, migration douloureuse évitée demain. La colonne `role` existe avec une seule valeur (`owner`) : un contrôle d'accès par rôle pourra être ajouté plus tard sans changement de schéma. L'organisation active est portée par la session. **Aucun sélecteur d'organisation, aucun RBAC n'est construit au MVP** — conformément au cadrage `docs/mvp-commercial.md` (multi-utilisateur en P1, rôles en P2).

---

## 7. Authentification et autorisation

**Décision : authentification déléguée à Supabase Auth.** Nous n'implémentons ni hachage de mot de passe, ni jetons de réinitialisation, ni gestion de session.

Périmètre P0 conforme au MVP : inscription (e-mail + mot de passe), connexion, déconnexion, mot de passe oublié, vérification d'e-mail, session persistante avec expiration, suppression de compte.

- À la première connexion, un enregistrement `users` est créé dans notre schéma avec l'identifiant de l'utilisateur d'authentification comme clé primaire, ainsi qu'une `organization` et un `membership` (`owner`). C'est le seul moment où une organisation est créée.
- L'autorisation au MVP tient en trois vérifications, appliquées dans le shell applicatif : **session valide** → **appartenance à l'organisation active** → **abonnement donnant accès** (§14).
- Le point d'extension pour un futur RBAC est unique et déjà nommé : `assertCan(context, action, resource)`. Au MVP, cette fonction renvoie vrai pour tout membre. Elle est appelée dès maintenant aux endroits sensibles pour que l'ajout de rôles ne nécessite pas de chasser les appels manquants.
- Double authentification : hors P0 (P1 dans le MVP), disponible côté fournisseur sans changement d'architecture.

Détails de sécurité (durcissement, en-têtes, limitation de débit, RGPD) : [`security.md`](security.md).

---

## 8. L'argent — règle d'architecture

**C'est une règle, pas une préférence. Elle ne se négocie pas au cas par cas.**

| Règle | Détail |
|---|---|
| **Stockage** | Tous les montants sont des **entiers en centimes** (`Int` en base, `number` entier en TypeScript). Aucune colonne monétaire en `float`/`double`. Les colonnes portent le suffixe `_cents` (`unit_price_cents`, `total_ttc_cents`) pour rendre toute confusion visible à la lecture. |
| **Quantités** | `Decimal(12,3)` en base (une prestation peut valoir 1,5 jour), manipulées en **millièmes entiers** dans le code (1,5 → 1500). |
| **Taux de TVA** | Stockés en points de base entiers (2000 = 20,00 %) pour éviter tout flottant dans le chemin de calcul. |
| **Calcul** | ⚑ **Arithmétique entière exacte, sans bibliothèque décimale** (validé au Lot 0) : montants en centimes, quantités en millièmes et taux en points de base étant tous entiers, `BigInt` suffit — `decimal.js`, initialement prévu, est retiré. **Arrondi une seule fois par étape documentée**, dans cet ordre repris de la sémantique validée en V0 : `brut = round(qté × PU)` → `remise = round(brut × taux)` → `net = brut − remise` → `TVA = round(net × taux)` → `TTC = net + TVA`. |
| **Arrondi** | Au centime, **arithmétique (half-up)**. Une seule fonction `roundToCents()` dans tout le code. |
| **Totaux de document** | **Somme des montants de lignes stockés** — jamais recalculés par une formule au niveau document. Garantit que le PDF, l'écran et la base affichent le même chiffre au centime près. |
| **TVA** | Récapitulée **par taux** (la V0 le fait déjà), pas globalement : obligation de présentation sur une facture française. |
| **Formatage** | `Intl.NumberFormat('fr-FR')` uniquement à l'affichage. Une valeur formatée n'est **jamais** reconvertie en nombre, ni stockée, ni comparée. |

Une suite de tests unitaires dédiée couvre les cas piégeux : remises produisant des demi-centimes, TVA à 5,5 % / 10 % / 20 % sur la même facture, quantités décimales, arrondis cumulés sur vingt lignes, total à zéro, montant négatif refusé.

---

## 9. Devis → Facture → Paiement

Le workflow le plus critique du produit. Modèle d'états et de transitions :

```
DEVIS                                    FACTURE
brouillon ──envoyer──> envoyé            brouillon ──émettre──> émise ──(dérivé)──> partiellement payée
   │                     │                   │        (numéro alloué,      │              payée
   │                     ├──accepter──┐      │         snapshots figés,    │              en retard
   │                     │            │      │         PDF généré)         │
   └──supprimer          ├──refuser   └──────┘                             └──annuler──> annulée
    (possible)           └──expirer      transformation                        (P0 : trace,
                                                                                avoir en P1)
```

### 9.1 Ce qui est stocké et ce qui est dérivé

**Stocké** (les faits) : `issued_at`, `cancelled_at`, `due_date`, `total_ttc_cents`, `amount_paid_cents`, et les paiements individuels.
**Dérivé** (jamais stocké en double) : le statut affiché.

```
si cancelled_at        → annulée
sinon si issued_at nul → brouillon
sinon si payé ≥ total  → payée
sinon si échéance < aujourd'hui → en retard
sinon si payé > 0      → partiellement payée
sinon                  → émise
```

Cette fonction pure est **partagée** entre l'affichage, le moteur d'insights et les listes. `amount_paid_cents` est un agrégat maintenu **dans la même transaction** que l'insertion du paiement, ce qui permet aux requêtes de liste de filtrer les impayés en SQL sans recalculer, tout en gardant une seule règle métier.

### 9.2 Immutabilité — la règle qui protège le produit

> **Une facture émise ne change jamais.** Ni parce que le client a déménagé, ni parce qu'un tarif a évolué, ni parce que les informations de l'entreprise ont été corrigées.

Mise en œuvre — c'est le concept que la V0 avait déjà juste, porté tel quel :

- à l'émission, la facture **copie** dans ses propres colonnes : identité et adresse du client (`client_snapshot`), identité légale de l'émetteur (`seller_snapshot`), mentions légales, conditions de paiement ;
- les **lignes sont des données propres** au document (libellé, prix unitaire, taux de TVA, remise copiés à l'instant de l'émission), jamais une simple référence au catalogue ;
- après émission, l'application n'autorise aucune écriture sur la facture, ses lignes ou ses snapshots — hors `cancelled_at` et l'ajout de paiements. Cette interdiction est doublée d'un **trigger de base de données**, pour qu'un bug applicatif ne puisse pas la contourner ;
- le PDF stocké est la version de référence ; il est rendu à partir des snapshots, donc reproductible à l'identique.

Un devis suit la même logique à l'envoi, avec une contrainte légale moindre.

### 9.3 Transformation devis → facture

Opération unique et transactionnelle : lecture du devis accepté → création de la facture (statut brouillon) avec **copie** des lignes et des snapshots → lien `invoice.quote_id` → marquage du devis comme transformé. Un devis ne peut être transformé qu'**une seule fois** : contrainte d'unicité en base sur `invoice.quote_id`, pas seulement un contrôle applicatif.

### 9.4 Paiements

Enregistrement manuel (date, montant en centimes, moyen, référence). Dans une transaction : insertion du paiement → recalcul et écriture de `amount_paid_cents`. Un paiement ne peut pas dépasser le reste dû (règle métier, message explicite). Le paiement partiel est de première classe dès le P0 — c'est le cas courant chez les TPE (acomptes).

### 9.5 Transactions — liste exhaustive

Ces quatre opérations sont atomiques, sans exception : **émission de facture** (numéro + snapshots + PDF), **transformation devis → facture**, **enregistrement d'un paiement**, **traitement d'un webhook Stripe**.

---

## 10. Numérotation des documents

Le backlog V0 signale déjà que la numérotation est « indicative » ; l'audit confirme un `MAX(numéro) + 1` calculé en mémoire — non fiable en concurrence.

**Conception V1 :**

- table `document_counters (organization_id, doc_type, year, last_value)`, clé primaire composite ;
- allocation **dans la transaction d'émission**, par `UPDATE document_counters SET last_value = last_value + 1 WHERE (org, type, year) RETURNING last_value` : le verrou de ligne Postgres sérialise les demandeurs concurrents ;
- si la transaction échoue, l'incrément est annulé avec elle : **pas de trou**.

**Les séquences Postgres sont écartées** précisément parce qu'elles sont non transactionnelles (un `ROLLBACK` laisse un trou) et globales, alors que nous avons besoin d'un compteur par organisation et par année.

Deux règles complémentaires :

- **le numéro est attribué à l'émission, jamais à la création du brouillon** — sinon un brouillon abandonné laisse un trou dans la séquence légale. La V0 a déjà cette intuition (un brouillon a `numero: null`) ;
- contrainte `UNIQUE (organization_id, invoice_number)` en base : même en cas de bug applicatif, un doublon est impossible.

Le format (`FAC-2026-00001`) reste configurable par organisation (préfixe, inclusion de l'année), avec une règle immuable : **le format ne peut plus être modifié une fois qu'un document a été émis dans l'exercice en cours.**

---

## 11. Moteur d'insights

**Décision : calcul à la demande, aucune persistance.**

Justification : quelques centaines de lignes par organisation ; un calcul complet tient dans une poignée de requêtes indexées. Persister introduirait de l'invalidation de cache — c'est-à-dire des bugs — pour un gain nul. Comme l'indique déjà `docs/mvp-commercial.md`, aucune entité `Insight` n'est créée.

Architecture, en droite ligne de la V0.13 :

```
Server Component du Dashboard
   └── insights/context.ts     assemble le contexte (requêtes bornées, en parallèle)
        └── insights/engine.ts  FONCTION PURE — aucune E/S, aucune date implicite
             └── { alerts, priorities, opportunities }
```

Invariants du moteur :

- **pur et déterministe** : mêmes entrées, même sortie ; la date de référence et les seuils sont des paramètres ;
- **sans accès à la base ni au réseau** : il reçoit des données déjà chargées ;
- **explicable** : chaque insight porte l'identifiant de sa règle et la donnée qui la déclenche ;
- **configurable** : les seuils viennent des paramètres de l'organisation (déjà le cas en V0) ;
- **testé par règle** : cas déclenché, non déclenché, valeur limite, absence de données — la suite `tests/insights-engine.test.js` de la V0 est portée telle quelle, elle constitue le cahier de recette du moteur.

Les règles du MVP sont **exactement celles de la V0.13** décrites dans `docs/insights-engine.md` : aucune nouvelle règle n'est introduite par la V1. La V1 change la source des données, pas la logique décisionnelle.

**Place de l'IA — invariant d'architecture :** une éventuelle couche d'IA ne pourra qu'**enrichir** une sortie déterministe déjà calculée (reformuler, hiérarchiser, résumer). Elle ne pourra jamais être la source d'un fait affiché, ni être nécessaire au fonctionnement du cockpit. Le produit doit rester entièrement fonctionnel avec l'IA désactivée.

---

## 12. Dashboard — flux de données

Le Dashboard est le point d'entrée du produit : sa performance est une caractéristique produit, pas un détail.

- **Un seul aller-retour serveur** par chargement : le Server Component orchestre un petit nombre de requêtes en parallèle. Interdit : vingt-cinq requêtes indépendantes déclenchées depuis le navigateur.
- **Les agrégats sont calculés en SQL** (`SUM`, `COUNT` avec filtres de dates et index), jamais en chargeant toutes les lignes pour les additionner en JavaScript. Concerne : CA facturé sur la période, encaissé sur la période, reste à encaisser, solde de trésorerie.
- **Les listes sont bornées** : les insights sont plafonnés (4 alertes, 6 priorités, 4 opportunités — plafonds déjà en place en V0), donc aucune pagination n'est nécessaire sur le Dashboard.
- **La période est un paramètre d'URL** (`?periode=mois`) : état partageable, pas de bibliothèque d'état client, rendu serveur direct. La comparaison à la période précédente est une seconde agrégation sur la même requête.
- **Index requis** dès la première migration : `(organization_id, issued_at)`, `(organization_id, due_date)`, `(organization_id, status)` sur les factures ; `(organization_id, scheduled_at)` sur les activités ; `(organization_id, movement_date)` sur la trésorerie.
- **Budget de performance** : rendu serveur du Dashboard sous **500 ms** aux volumes du MVP. Un dépassement est traité comme un bug, pas comme une fatalité — et la première réponse est un index, pas un cache.

---

## 13. Documents, PDF et facturation électronique

### 13.1 PDF

- **Généré côté serveur à l'émission** puis **stocké** — pas régénéré à chaque téléchargement (déterminisme, coût, traçabilité).
- Chemin de stockage scopé par tenant : `org/{organizationId}/{invoices|quotes}/{documentId}.pdf`. Le seau n'est **jamais public**.
- Table `documents` : type, référence métier, chemin, taille, empreinte SHA-256, date de génération. L'empreinte permet de prouver qu'un document n'a pas été altéré.
- **Téléchargement par URL signée de courte durée** (quelques minutes), émise après vérification de l'appartenance à l'organisation.
- **Régénération** : autorisée pour un brouillon ; pour un document émis, le PDF stocké fait foi. Une régénération exceptionnelle (correction de gabarit) ne remplace jamais silencieusement l'original : elle crée une nouvelle version avec un motif enregistré.
- **Conservation** : les documents survivent à la suppression d'un client (ils appartiennent à l'organisation, pas au client). La durée légale de conservation des factures est **à confirmer avant implémentation** (§16).

### 13.2 Facturation électronique — frontière d'intégration

Le produit vise la France ; l'architecture doit être **prête** à transmettre des factures électroniques sans que le cœur métier ne dépende d'un fournisseur.

```
module invoices            module einvoicing              extérieur
     │                          │                             │
     │  émet une facture        │                             │
     ├────── port EInvoiceDispatcher ──────┐                  │
     │  (interface définie ici)            │                  │
     │                          adaptateur fournisseur ───────► Plateforme Agréée
     │                          │                             │
     │◄──── statut de transmission (table dédiée) ◄────────────┘
```

- **Port minimal** (une interface, pas une abstraction géante) : `dispatch(invoiceSnapshot) → { providerRef, status }` et `getStatus(providerRef)`.
- **Table `einvoice_transmissions`** : facture, fournisseur, statut, référence fournisseur, empreinte de la charge utile, dernière erreur, horodatages. L'état est observable sans coupler le domaine.
- **Champs de données nécessaires captés dès le P0** même si la transmission n'est pas branchée : identifiants légaux du client (SIREN/SIRET, numéro de TVA intracommunautaire), identifiants de l'émetteur, taux et bases de TVA par taux, référence de commande éventuelle. Les ajouter plus tard imposerait de redemander ces informations sur des documents déjà émis — donc on les prévoit maintenant.
- **P0 = la frontière et les données. P1 = l'intégration réelle** à une plateforme, conformément au cadrage MVP.
- **Cockpit Entrepreneur ne devient pas lui-même une Plateforme Agréée**, sauf décision future explicite.

> ⚠️ **À confirmer avant implémentation, hors de ce dépôt** : calendrier et périmètre exact de l'obligation applicable aux indépendants et TPE, formats structurés exigés, obligations de e-reporting, durée et modalités d'archivage à valeur probante, choix du prestataire. Ces éléments sont réglementaires et évolutifs : ils doivent être validés avec un professionnel au moment du développement, et non déduits de ce document.

---

## 14. Abonnement SaaS

```
Cockpit ──Checkout──> Stripe ──webhook──> /api/webhooks/stripe ──> table subscriptions ──> accès produit
```

- **Une seule offre au départ**, avec période d'essai optionnelle. Le pricing n'est pas validé (`docs/mvp-commercial.md`, hypothèse H9) : l'architecture doit permettre d'en changer sans refonte, pas d'anticiper une grille tarifaire.
- **Stripe Checkout** pour la souscription et **Customer Portal** pour la gestion (moyen de paiement, résiliation, factures d'abonnement) : nous n'écrivons aucune interface de facturation.
- **Table `subscriptions`** locale, miroir de l'état Stripe : `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status` (`trialing | active | past_due | canceled`), `current_period_end`. C'est cette table, jamais un appel à Stripe en direct, qui conditionne l'accès — le produit doit rester utilisable si l'API de Stripe est momentanément indisponible.
- **Idempotence des webhooks** : table `stripe_events (event_id PK, processed_at)`. Un événement déjà traité est ignoré. Le traitement est transactionnel. Stripe rejoue les événements : ce n'est pas une hypothèse, c'est une certitude.
- **Signature vérifiée** sur chaque webhook ; l'organisation est résolue par l'identifiant client Stripe (un des rares chemins autorisés à utiliser le client de base « système », §6.1).
- **Décision ouverte** (§18) : comportement exact en `past_due` — lecture seule, période de grâce, ou blocage. C'est un arbitrage produit, pas technique.

---

## 15. Trésorerie — périmètre strict

Conformément au MVP : trésorerie **opérationnelle**, pas comptabilité.

**Entrent dans le calcul :**
- les **encaissements réels** issus des paiements de factures (automatique, aucune double saisie) ;
- les **mouvements saisis manuellement** : charges prévues ou réalisées (loyer, fournisseurs, salaires, impôts…) ;
- un **solde d'ouverture** déclaré par l'utilisateur.

**Projection** = solde courant + encaissements attendus (factures émises non payées, échéance dans l'horizon) − décaissements prévus dans l'horizon.

**Explicitement hors périmètre**, et à répéter à chaque tentation : connexion bancaire, rapprochement bancaire, écritures comptables, plan comptable, déclarations de TVA, bilan. La trésorerie V1 est une **vue déclarative**, pas une source de vérité comptable — et l'interface doit le dire à l'utilisateur.

---

## 16. Ce que nous ne construisons pas dans la V1

Reprend et complète la section « NOT NOW » de `docs/mvp-commercial.md`, côté technique :

Microservices · event sourcing · CQRS · bus d'événements · file d'attente et workers · Redis · Kubernetes/Docker en production · GraphQL · monorepo multi-applications · micro-frontends · bibliothèque d'état client global · ORM secondaire · moteur de recherche · multi-région · cache applicatif · feature flags dynamiques · internationalisation (le produit est en français) · thème sombre · application mobile native · IA nécessaire au fonctionnement · RBAC granulaire · multi-entités légales par organisation · connexion bancaire.

Chacun de ces éléments demande une **décision écrite** pour être réintroduit. La règle par défaut est : *non*.

---

## 17. Structure de projet (indicative)

```
cockpit-v1/
├── app/                                # Next.js App Router — UI et points d'entrée
│   ├── (auth)/                         #   connexion, inscription, mot de passe oublié
│   ├── (app)/                          #   application authentifiée
│   │   ├── layout.tsx                  #     shell : session, org, garde d'abonnement
│   │   ├── page.tsx                    #     DASHBOARD (point d'entrée principal)
│   │   ├── clients/
│   │   ├── activites/
│   │   ├── devis/
│   │   ├── factures/
│   │   ├── tresorerie/
│   │   └── parametres/
│   └── api/                            #   webhooks Stripe, téléchargement de documents
├── modules/                            # MÉTIER — indépendant de Next.js
│   ├── organization/                   #   service.ts · repository.ts · schema.ts
│   ├── clients/
│   ├── activities/
│   ├── quotes/                         #   + calc.ts (pur)
│   ├── invoices/                       #   + calc.ts · status.ts (purs)
│   ├── cash/
│   ├── numbering/
│   ├── insights/                       #   context.ts (E/S) · engine.ts (PUR) · rules/
│   ├── documents/
│   ├── billing/
│   ├── notifications/
│   └── einvoicing/                     #   port.ts + adapters/
├── lib/
│   ├── db/                             #   client Prisma + extension tenant + db/system.ts
│   ├── auth/                           #   session, TenantContext, assertCan
│   ├── money/                          #   centimes, arrondi, TVA, formatage
│   └── errors/
├── components/                         # UI partagée (design system)
├── emails/                             # gabarits d'e-mails
├── pdf/                                # gabarits PDF (devis, facture)
├── prisma/
│   ├── schema.prisma                   # source de vérité du modèle de données
│   ├── migrations/
│   └── seed.ts                         # jeu de démonstration (issu de la V0)
├── tests/
│   ├── unit/                           #   argent, insights, statuts
│   ├── integration/                    #   base réelle, tenant, workflows
│   ├── isolation/                      #   ISOLATION MULTI-TENANT (bloquant CI)
│   └── e2e/                            #   Playwright, parcours critiques
└── docs/                               # documents produit et architecture (repris de la V0)
```

Trois lectures de cette arborescence :
- **`modules/` ne dépend pas de `app/`** : la logique métier ignore Next.js et pourrait survivre à un changement de framework ;
- les fichiers **`calc.ts`, `status.ts`, `engine.ts` sont purs** : aucune E/S, testables sans base ;
- **`lib/db/system.ts` est le seul point de contournement du filtrage tenant**, et il est surveillé.

---

## 18. Frontend

- **Framework** : React via Next.js App Router. **Rendu serveur par défaut** ; composants clients uniquement là où il y a de l'interactivité réelle (formulaire de ligne de devis, filtres, cases de tâches).
- **Routing** : fichiers de l'App Router. La période du Dashboard, les filtres et la pagination vivent dans l'URL.
- **Données serveur** : pas de bibliothèque de récupération de données côté client. Lecture par Server Components, écriture par Server Actions, rafraîchissement par revalidation. Aucun Redux/Zustand/MobX : **il n'y a pas d'état global à gérer** — c'est une couche entière supprimée.
- **État local** : `useState` dans les rares composants interactifs.
- **Formulaires et validation** : React Hook Form + **schémas Zod partagés client/serveur**. La validation client est un confort ; **la validation serveur est la seule qui fasse autorité**, systématiquement.
- **Design system** : Tailwind CSS + shadcn/ui, avec les **tokens de la charte V0** (couleurs, espacements, rayons, typographie) repris depuis `css/styles.css`. La V0 fournit le langage visuel ; on ne le réinvente pas.
- **Graphiques** : Recharts, pour le seul graphique du niveau Performance. Pas de bibliothèque de dataviz lourde.
- **Responsive** : conception mobile d'abord sur le Dashboard, qui est le point d'entrée. Critère repris du MVP : utilisable à ~390 px sans défilement horizontal ni information cachée, vérifié avec la méthode établie en V0.13.1 (mesure `scrollWidth`/`clientWidth`, pas une capture d'écran approximative).
- **PWA** : manifeste et icônes dès le MVP (installation sur l'écran d'accueil, coût quasi nul) ; **pas de mode hors ligne** — il impliquerait une synchronisation et des conflits, hors périmètre.

---

## 19. Environnements

| Environnement | Base | Objet |
|---|---|---|
| **Local** | Postgres local (Docker) ou Supabase local | Développement, tests d'intégration |
| **Préversion** | Branche de base éphémère par pull request | Revue fonctionnelle sur URL dédiée, déploiement automatique Vercel |
| **Production** | Base managée, région UE, sauvegardes actives | Clients réels |

- **Secrets** : variables d'environnement du fournisseur, jamais dans le dépôt ; un `.env.example` documente les clés attendues sans valeur. Rotation possible sans redéploiement de code.
- **Migrations** : versionnées dans le dépôt, appliquées à l'étape de déploiement, jamais à la main en production. Toute migration destructive (suppression de colonne, changement de type) passe par une revue explicite et une stratégie en deux temps.
- **Jeu de démonstration** : script `seed.ts` reprenant le scénario de la V0 (clients, devis, facture en retard, RDV du jour), avec **dates relatives à aujourd'hui** — c'est le mécanisme déjà mis au point en V0.13.1, à porter.
- **Règle absolue** : **aucune copie de données de production vers un environnement de préversion ou local.** Un besoin de reproduction se traite avec des données anonymisées ou fabriquées.

---

## 20. Intégration continue et Git

- `main` **protégée** : pas de commit direct, pull request obligatoire, CI verte obligatoire.
- Branches courtes, une intention par pull request. Convention de nommage reprise de `docs/versioning.md`.
- **Pipeline CI**, dans cet ordre, tout bloquant : `typecheck` → `lint` → tests unitaires → tests d'intégration (Postgres éphémère) → **tests d'isolation multi-tenant** → build → (sur préversion) parcours Playwright de fumée.
- **Contrôle des migrations** : la CI vérifie que le schéma Prisma et les migrations sont cohérents et qu'aucune migration non appliquée ne traîne.
- Déploiement de préversion automatique par pull request ; production déclenchée par la fusion dans `main`.
- Le versioning produit continue de suivre `docs/versioning.md` (V1, V1.x).

---

## 21. Stratégie de tests

Objectif : **pas de couverture maximale, mais une couverture placée là où une erreur coûte cher.**

| Niveau | Outil | Périmètre | Exigence |
|---|---|---|---|
| **Unitaire** | Vitest | Argent (centimes, TVA, arrondis, remises) · statuts de documents · moteur d'insights règle par règle | Le plus fourni. Portage direct des tests V0 du moteur d'insights. |
| **Intégration** | Vitest + Postgres réel | Numérotation (y compris **concurrence simulée**) · transformation devis→facture · émission et immutabilité · paiements et reste dû · webhooks Stripe et idempotence | Base réelle, pas de simulacre d'ORM. |
| **Isolation** | Vitest + Postgres réel | Cross-tenant sur **tous** les modèles ; garde de schéma ; garde d'importation du client brut | **Bloquant en CI** (§6.2). |
| **Bout en bout** | Playwright | Inscription → client → devis → facture → paiement → Dashboard à jour ; téléchargement de PDF ; souscription | 3 à 5 parcours, pas davantage. |

**Zones où une erreur serait grave**, et donc prioritaires : l'argent, l'isolation des données, l'immutabilité et la numérotation des documents, l'état d'abonnement. **Zones volontairement peu testées** : rendu visuel, textes, écrans de configuration.

---

## 22. Sauvegardes et résilience

- **Sauvegarde automatique quotidienne** de la base, chiffrée, avec rétention d'au moins 30 jours et récupération à un instant donné si le fournisseur la propose.
- **Restauration testée au moins une fois avant la bêta payante**, et documentée — une sauvegarde jamais restaurée n'est pas une sauvegarde. C'est un critère du « Done » du MVP.
- **Stockage de documents** : réplication assurée par le fournisseur ; les PDF émis sont regénérables à partir des snapshots en base, ce qui constitue un second filet.
- **Conséquence d'incident, à assumer explicitement** : perte maximale de données d'une journée (fenêtre de sauvegarde), indisponibilité tolérée de quelques heures. C'est acceptable pour l'usage visé, et cela doit être écrit dans les conditions de service plutôt que promis implicitement.

---

## 23. Observabilité

Minimum viable pour une petite équipe, pas une salle de contrôle :

- **Erreurs** front et back dans Sentry, avec `organizationId` et identifiant de corrélation, **sans donnée personnelle ni montant** ;
- **Journaux** applicatifs structurés (fournisseur d'hébergement), consultables sur incident ;
- **Disponibilité** : sonde externe sur la page d'accueil et sur une route de santé, alerte par e-mail ;
- **Performance** : suivi du temps de rendu du Dashboard (budget §12) ;
- **Alertes techniques** limitées à ce qui exige une action : site indisponible, taux d'erreur anormal, **échec de webhook Stripe** (silencieux, il fausserait les accès), échec d'envoi d'e-mail sur un document.
- **Audit minimal en base** : `issued_at`/`issued_by`, `cancelled_at`/`cancelled_by`/motif, historique des paiements, journal des webhooks. Pas de table d'audit générique au MVP.

---

## 24. Roadmap technique — lots verticaux

Principe : **chaque lot produit quelque chose de vérifiable à l'écran.** Pas six mois d'infrastructure avant le premier écran.

| Lot | Contenu | Vérifiable par |
|---|---|---|
| **Lot 0 — Réduction des risques** | ✅ **Réalisé** : isolation multi-tenant (Prisma + RLS), numérotation concurrente, PDF et immutabilité documentaire — 60 tests sur PostgreSQL réel. Reste à couvrir : boucle webhook Stripe, PDF sur l'hébergeur cible | [`lot-0-validation.md`](lot-0-validation.md) |
| **Lot 1 — Socle** | Projet, TypeScript, lint, CI · Postgres + Prisma · authentification · organisation + appartenance · **contexte tenant + tests d'isolation** · shell applicatif | Se connecter, créer son organisation, voir un écran vide mais réel |
| **Lot 2 — Clients + Dashboard minimal** | CRUD clients · Dashboard niveau 1 (situation) sur données réelles | Première donnée saisie visible dans le cockpit |
| **Lot 3 — Devis** | Devis, lignes, calculs en centimes, statuts, PDF devis | Émettre un devis et télécharger son PDF |
| **Lot 4 — Factures et paiements** | Transformation devis→facture · numérotation · immutabilité · paiements · PDF facture · e-mail d'envoi | Le flux financier complet, de bout en bout |
| **Lot 5 — Cockpit décisionnel** | Activités et tâches · trésorerie · **moteur d'insights** (niveaux 2, 3, 4) · niveau 5 performance | Le Dashboard des 5 niveaux sur données réelles |
| **Lot 6 — Exploitable** | Abonnement Stripe · RGPD (export, suppression) · sauvegardes vérifiées · observabilité · durcissement | Une bêta payante conforme au « Done » du MVP |

L'ordre n'est pas négociable sur un point : **le lot 1 livre l'isolation multi-tenant et ses tests avant toute donnée métier.** Rétrofitter l'isolation est le scénario le plus coûteux et le plus dangereux du projet.

---

## 25. Complexité et risques

| Bloc | Complexité | Commentaire |
|---|---|---|
| Clients, tâches, paramètres, catalogue | **Faible** | CRUD classique |
| Devis, trésorerie, e-mail, PWA | **Moyenne** | Peu de pièges |
| Agrégations du Dashboard | **Moyenne** | Attention aux requêtes naïves |
| Génération et stockage PDF | **Élevée** | Gabarits, polices, exécution serverless |
| Abonnement Stripe et webhooks | **Élevée** | Idempotence, états, rejeux |
| Factures, paiements, numérotation | **Critique** | Argent + contrainte légale |
| **Isolation multi-tenant** | **Critique** | Une faille = incident majeur et perte de confiance |

**Principaux risques techniques**

1. **Fuite entre organisations** — le risque le plus grave. Atténuation : filtrage automatique par extension Prisma, contexte obligatoire, tests d'isolation bloquants, RLS en durcissement.
2. **Erreurs de centimes** — insidieuses, découvertes par un client. Atténuation : entiers partout, une seule fonction d'arrondi, tests des cas piégeux.
3. **Numérotation trouée ou dupliquée** — problème légal. Atténuation : compteur transactionnel, contrainte d'unicité, attribution à l'émission, test de concurrence.
4. **PDF fragile en serverless** — à prototyper au lot 0, avant tout engagement.
5. **Webhooks Stripe manqués ou rejoués** — accès erronés. Atténuation : idempotence en base, alerte sur échec, réconciliation manuelle possible.
6. **Dérive de périmètre** — le risque le plus probable. Atténuation : `docs/mvp-commercial.md` et §16 comme garde-fous, décision écrite exigée.
7. **Dépendance à l'hébergeur** — atténuation : Next.js s'exécute sur tout hébergeur Node ; aucune fonction propriétaire dans le métier.

**À prototyper tôt (lot 0)** : PDF sur l'hébergeur cible, numérotation concurrente, boucle webhook Stripe.

---

## 26. Décisions structurantes (ADR compact)

| # | Décision | Statut | Détail |
|---|---|---|---|
| ADR-01 | Nouvelle application V1 plutôt que refactoring de la V0 | Actée | [`migration-v0-v1.md`](migration-v0-v1.md) |
| ADR-02 | Monolithe modulaire, une base, un déploiement | Actée | §4 |
| ADR-03 | Next.js + TypeScript en full-stack | Actée | §3 |
| ADR-04 | PostgreSQL + Prisma | Actée | §3 |
| ADR-05 | Authentification déléguée (Supabase Auth) | Actée | §7 |
| ADR-06 | ⚑ Isolation tenant : filtrage applicatif **et** RLS active dès le Lot 1, policy exigeant organisation **et** appartenance | **Révisée au Lot 0** | §6, `lot-0-validation.md` §8.1-8.2 |
| ADR-06b | ⚑ Trois rôles PostgreSQL : propriétaire (DDL), applicatif (`NOBYPASSRLS`), système (`BYPASSRLS`) confiné | Ajoutée au Lot 0 | §6.1, `lot-0-validation.md` §8.3 |
| ADR-07 | ⚑ Argent en entiers (centimes, millièmes, points de base), arithmétique entière **sans bibliothèque décimale** | Actée — **règle inviolable**, simplifiée au Lot 0 | §8, `lot-0-validation.md` §6 |
| ADR-08 | Immutabilité des documents émis par snapshots + trigger | Actée — **règle inviolable** | §9.2 |
| ADR-09 | Numérotation par compteur transactionnel, allouée à l'émission | Actée | §10 |
| ADR-10 | Insights calculés à la demande, moteur pur, IA jamais nécessaire | Actée | §11 |
| ADR-11 | Server Actions comme API principale, REST pour les appels machine | Actée | §5 |
| ADR-12 | Frontière `einvoicing` par port + adaptateur, sans couplage fournisseur | Actée (intégration en P1) | §13.2 |
| ADR-13 | Aucune file d'attente ni ordonnanceur au MVP | Actée | §5.2 |
| ADR-14 | PDF généré côté serveur puis stocké, URL signée | Actée | §13.1 |

---

## 27. Challenge de l'architecture

Questions posées à la conception avant de la figer.

1. **Trop complexe pour le MVP ?** Non, après retraits : pas de file d'attente, pas d'ordonnanceur, pas d'état global client, pas de GraphQL, pas de cache, pas de service séparé. Il reste une application, une base, quatre services externes (auth, stockage, e-mail, paiement) dont trois sont des dépendances incompressibles d'un SaaS.
2. **Peut-on retirer une couche ?** Trois l'ont déjà été (file d'attente, état client, couche API). La couche repository pourrait fusionner avec le service, mais c'est elle qui porte le filtrage tenant : elle reste. La séparation `calc.ts` pur coûte peu et rend l'argent testable : elle reste.
3. **Une seule personne peut-elle la comprendre ?** Oui : un langage, un framework, un modèle de données lisible dans un fichier, douze modules aux noms métier. Un développeur extérieur doit pouvoir se repérer avec ce document et `schema.prisma`.
4. **Sûre pour un SaaS B2B ?** Sur l'essentiel oui : authentification déléguée, isolation structurelle et testée, immutabilité documentaire, secrets côté serveur, sauvegardes. Le point de vigilance assumé est le report de RLS (§6.1), avec un critère de déclenchement écrit.
5. **Tient-elle 100 puis 1 000 entreprises ?** Oui sans réécriture : Postgres managé absorbe ces volumes largement ; les points de tension arriveraient sur les agrégats du Dashboard, traités par des index, puis éventuellement par des vues matérialisées. Rien n'impose de changer de forme d'architecture avant plusieurs ordres de grandeur.
6. **Protège-t-elle l'argent et les données ?** C'est là que porte l'essentiel de l'effort : entiers de centimes, transactions explicites, compteur verrouillé, snapshots + trigger, tests d'isolation bloquants.
7. **Des outils choisis par mode ?** Vérification faite, deux ont été écartés à ce titre : une bibliothèque d'état client (inutile en rendu serveur) et une file d'attente (aucun travail asynchrone au P0). Ceux qui restent répondent chacun à un besoin nommé.
8. **Développable efficacement avec Claude Code ?** C'est un critère de sélection assumé : TypeScript de bout en bout, frameworks à très large corpus, schéma déclaratif, fonctions pures testables, frontières explicites — autant de conditions qui rendent la génération assistée fiable et vérifiable.

---

## 28. Décisions restant ouvertes

Elles nécessitent un arbitrage humain, produit ou juridique — elles ne bloquent pas le lot 1.

| Sujet | Question | Qui tranche | Quand |
|---|---|---|---|
| **Souveraineté de l'hébergement** | Vercel (rapidité) ou hébergeur UE/français (argument de vente B2B) ? | Chef de projet | Avant le lot 6 |
| **Dépôt V1** | Nouveau dépôt, ou dossier dans le dépôt actuel ? | Chef de projet | Avant le lot 1 |
| **Activation de RLS** | Durcissement avant la bêta payante, ou report ? | Technique | Avant le lot 6 |
| **Comportement en impayé** | `past_due` : lecture seule, grâce de N jours, ou blocage ? | Produit | Avant le lot 6 |
| **Essai gratuit** | Essai sans carte, avec carte, ou aucun essai ? | Produit (lié au pricing, hypothèse H9) | Avant le lot 6 |
| **Facturation électronique** | Calendrier applicable, formats, plateforme partenaire, archivage | **Validation juridique/comptable externe** | Avant toute implémentation |
| **Conservation légale vs suppression RGPD** | Comment concilier effacement du compte et obligation de conservation des factures ? | **Validation juridique** | Avant le lot 6 |
| **Fournisseur d'e-mail** | Resend (ergonomie) ou Brevo (éditeur UE) ? | Chef de projet | Avant le lot 4 |
