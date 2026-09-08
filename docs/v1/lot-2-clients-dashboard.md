# Lot 2 — Clients réels + premier Dashboard (compte rendu)

> Suite du Lot 1 (`lot-1-socle.md`) : le socle (auth, tenant, RLS, CI) était
> prouvé mais vide. Le Lot 2 commence à transformer la V1 en produit réel —
> un utilisateur authentifié peut désormais gérer de vrais clients, créer des
> tâches/relances, et voir un Dashboard 100% branché sur PostgreSQL.
>
> **Toujours pas construit** (hors périmètre, volontairement) : devis,
> factures, paiements, trésorerie, PDF, Stripe, facturation électronique,
> moteur d'insights complet, page Analyses.

---

## 1. Résumé

Un utilisateur authentifié peut : créer/rechercher/filtrer/consulter/modifier/
archiver de vrais clients persistés en base ; créer/terminer/réouvrir/
supprimer des tâches, éventuellement liées à un client ; voir un Dashboard
qui répond à trois questions (situation, priorités du jour, opportunités)
avec des données 100% réelles — **aucune métrique financière fictive**,
puisque devis/factures n'existent pas encore.

## 2. Client

Champs retenus (voir `prisma/schema.prisma`) : `kind` (particulier/entreprise),
`name`, `companyName`, `email`, `phone`, `status` (5 valeurs CRM), `notes`
(texte libre court), `lastContactAt`, `archivedAt`, `createdAt`, `updatedAt`.

**Statuts** (ADR-16) : `Prospect`, `Client actif`, `À relancer`, `Inactif`,
`Fidèle` — repris **tels quels** de la V0 (seule référence UX disponible,
déjà consommés par son moteur d'insights), sans ajout par excès de zèle.
`Litige`, présent dans `docs/v1/data-model.md`, n'a pas été porté : aucune
utilité identifiée pour le Dashboard du Lot 2. ⚑ **Hypothèse réversible** —
aucun test utilisateur conduit sur ces 5 statuts en V1.

**Archivage séparé du statut CRM** (décision Lot 2) : `archivedAt` est un
champ propre, plus une valeur de `status`. Un client peut être "fidèle" et
archivé (ancien client fidèle qu'on ne veut plus voir dans les listes
actives, mais pas "supprimé" — décision Lot 1 inchangée : suppression =
archivage, jamais de suppression physique).

Non repris de la V0 (volontairement, `docs/mvp-commercial.md`) : historique
de communication typé, documents liés, RDV liés, KPI décoratifs par client,
champs personnalisés, adresse structurée, SIRET/TVA (nécessaires à la
facturation, pas encore construite).

## 3. Tasks

Modèle autonome (ADR-16), **pas** la table `activities` (RDV + tâches
fusionnés) prévue par `data-model.md` : le Lot 2 exclut explicitement
l'agenda/calendrier. Champs : `id, organizationId, clientId? , title,
dueDate, completedAt, priority (low/normal/high), createdAt, updatedAt`.

Fonctions : créer, terminer, réouvrir, supprimer, lister (avec/sans
terminées, filtrées par client). Pas de sous-tâches, pas de projets, pas de
récurrence, pas de collaboration.

**Point de sécurité explicite** : `clientId` est saisi par l'utilisateur (un
`<select>`), donc jamais fiable tel quel. `tasks/service.ts` vérifie, via
`clients/service.ts::assertClientBelongsToOrg`, que le client appartient
bien à l'organisation courante **avant** toute écriture — en plus de la RLS.
Testé explicitement (`tests/tasks.test.ts`, "A ne peut PAS créer une tâche
liée au Client de B", et la ré-assignation d'une tâche existante).

## 4. Dashboard

Server Component, une seule fonction serveur `getDashboardSnapshot(ctx)`
(`src/modules/dashboard/service.ts`) agrège tout via `withTenant` — pas de
requêtes séparées côté client. Structure reprise du positionnement produit :

- **Ma situation** — comptes : clients actifs, prospects, à relancer.
- **À surveiller** — tâches en retard (alertes).
- **Mes priorités** — tâches du jour, clients à relancer.
- **Opportunités** — clients actifs/prospects/fidèles sans contact récent.

Pas de section "Performance financière" : elle apparaîtra quand elle aura
quelque chose de réel à montrer (devis/factures, lots suivants).

## 5. Insights

Module `src/modules/insights/` (types, rules, engine — mêmes principes que
le moteur V0 : fonctions pures, déterministes, testables sans DB/horloge ;
réécrit en TypeScript, pas copié). 4 règles, toutes compatibles avec les
données existantes :

| Règle | Condition | Type / priorité |
|---|---|---|
| `taskOverdue` | tâche non terminée, échéance < aujourd'hui | `alert` / `critical` |
| `taskDueToday` | tâche non terminée, échéance = aujourd'hui | `priority` / `high` |
| `clientToFollowUp` | client actif (non archivé), statut `to_follow_up` | `priority` / `normal` |
| `clientNoRecentContact` | client actif/prospect/fidèle, dernier contact absent ou ≥ seuil configuré | `opportunity` / `normal` |

Aucune règle devis/facture — elles n'existent pas encore. Structure d'un
insight : `id, type, priority, title, description, actionLabel, actionHref,
entityType, entityId` — chaque insight mène quelque part (fiche client ou
tâche), jamais de carte sans destination.

## 6. Multi-tenancy

`Task` ajouté à `TENANT_SCOPED_MODELS` (extension Prisma, garde-fou) et à la
RLS (`prisma/rls.sql`, policy `tenant_isolation` identique à `clients` :
organisation ET appartenance réelle). Migration dédiée
(`20260908142800_row_level_security_tasks`) réapplique l'ensemble de
`rls.sql`, comme au Lot 1.

Nouveaux tests bloquants (`tests/tasks.test.ts`, `tests/isolation.test.ts`) :
lecture/écriture/suppression croisées A/B sur Task, insertion SQL brute
refusée par la RLS, et surtout — le point explicitement demandé — **A ne
peut pas créer ni ré-assigner une tâche au client de B**, vérifié à la fois
côté service (erreur métier claire) et côté DB (RLS, filet de sécurité).

## 7. Timezone

Convention : **Europe/Paris**, dès maintenant (`src/lib/datetime.ts`).
`todayInTimezone()` calcule "aujourd'hui" dans ce fuseau et le normalise à
minuit UTC — la même forme que `Task.dueDate` (`@db.Date`), pour rester
directement comparable sans dérive UTC (le piège classique : minuit UTC est
1h ou 2h du matin à Paris, ce qui décale "aujourd'hui" selon l'heure de la
requête). Toutes les règles ("aujourd'hui", "en retard", "dernier contact")
reçoivent leur date de référence en paramètre (`InsightContext.today`),
jamais `new Date()` en dur — testable sans dépendre du jour d'exécution
(`tests/insights.test.ts`, dates fixes 2026-06-15).

## 8. UX/mobile

Composants créés (`src/components/ui/`) : `Card`, `Button`, `Badge`,
`Input`/`Textarea`/`Field`, `Select`, `EmptyState` — le minimum réutilisable,
pas un design system étendu. Palette reprise de la V0 (indigo, slate).

Navigation minimale : Dashboard, Clients, Tâches, Réglages, déconnexion —
aucun lien vers Facturation/Trésorerie/Analyses (inexistants). Sidebar fixe
en desktop, barre horizontale scrollable en haut sur mobile — pur CSS
(`flex-col md:flex-row`), pas de JavaScript de menu.

Clients : cartes empilées en grille responsive (`grid-cols-1 sm:grid-cols-2
lg:grid-cols-3`), jamais un tableau. Pas de pagination — volume MVP trop
faible pour que ça apporte quoi que ce soit.

## 9. Cloud

**Statut inchangé depuis le Lot 1 : VALIDATION CLOUD REQUISE.** Aucun
credential Supabase n'était disponible dans cet environnement au Lot 2 non
plus. L'intégration Auth/Storage reste le code réel écrit au Lot 1, non
ré-exécuté contre un projet réel. Le protocole de validation manuelle
(`lot-1-socle.md` §13) n'a pas changé et reste à exécuter avant toute mise
en production. Le métier Client/Task n'a pas été bloqué par cette limite —
conformément à la consigne du Lot 2.

## 10. Tests

**81 tests Vitest**, tous verts, contre une vraie base PostgreSQL locale :

- `tests/isolation.test.ts` (18, hérités du Lot 1, inchangés).
- `tests/clients.test.ts` (15) : création/validation (statut, dates,
  e-mail), recherche, filtre par statut, archivage séparé du statut CRM.
- `tests/tasks.test.ts` (14) : CRUD, isolation croisée A/B, **clientId
  cross-tenant bloqué** (création et ré-assignation), insertion SQL brute
  refusée par la RLS.
- `tests/insights.test.ts` (23) : chaque règle testée en déclenchement,
  non-déclenchement, limite (seuil exact, veille/lendemain), absence de
  données, plus la convention de fuseau horaire (`todayInTimezone`).
- `tests/dashboard.test.ts` (5) : agrégats de comptage, tâches du
  jour/en retard dans les insights, relance dans les priorités, **aucune
  donnée de B dans le Dashboard de A**, seuil de relance par organisation.
- `tests/organizations.test.ts` (6, hérités du Lot 1, inchangés).

Lint, typecheck et build : tous verts (`npx eslint .`, `npx tsc --noEmit`,
`npm run build`). Tests V0 (racine du dépôt) : 6/6 toujours verts, V0
inchangée.

## 11. Fichiers principaux

```
v1/
  prisma/schema.prisma                          # Client enrichi, Task, Organization.clientFollowUpDays
  prisma/migrations/20260908142755_client_task_lot2/
  prisma/migrations/20260908142800_row_level_security_tasks/
  prisma/seed.ts                                 # démo réaliste, dates relatives
  src/lib/datetime.ts                             # convention Europe/Paris
  src/components/ui/                              # Card, Button, Badge, Input, Select, EmptyState
  src/modules/
    clients/                                      # validation/repository/service/actions étendus + presentation.ts
    tasks/                                         # nouveau module complet
    insights/                                      # types.ts, rules.ts, engine.ts
    dashboard/service.ts                           # getDashboardSnapshot()
    organizations/                                 # updateClientFollowUpDays + actions.ts (Settings)
    auth/requireTenantContext.ts                   # helper partagé (déduplique clients/tasks)
  src/app/app/
    page.tsx                                       # Dashboard réel
    clients/*                                       # liste (recherche/filtre), fiche, formulaires
    tasks/*                                          # liste, création
    settings/*                                       # seuil de relance + nom d'organisation
  tests/{clients,tasks,insights,dashboard}.test.ts + helpers.ts étendu
```

## 12. Hypothèses non validées

Aucun test utilisateur n'a été conduit sur la V1. Restent des hypothèses
réversibles :

- Les 5 statuts clients et leur wording exact.
- La hiérarchie du Dashboard (Ma situation / À surveiller / Mes priorités /
  Opportunités) et le regroupement des règles dans ces sections.
- Le niveau de détail de la fiche Client (notes en texte libre, pas de champs
  structurés).
- Le seuil de relance par défaut (30 jours) et le fait qu'il soit configurable
  au niveau organisation plutôt qu'ailleurs.
- L'utilité réelle du module Tasks tel que conçu (vs. un système plus/moins
  élaboré).

## 13. Limites

- Auth/Storage cloud toujours non validés réellement (voir §9).
- Pas de test E2E Playwright : l'authentification réelle (Supabase) n'étant
  pas disponible, un parcours "connexion → créer client → créer tâche →
  Dashboard" authentifié ne peut pas être automatisé dans cet environnement
  sans contourner la sécurité (ce qui est explicitement interdit). Les tests
  d'intégration (`tests/*.test.ts`) couvrent la même logique métier au niveau
  service, contre une vraie base — c'est le meilleur environnement de test
  disponible ici.
- Vérification mobile (~390px) faite par revue de code (classes Tailwind
  responsive, grilles, sidebar → barre horizontale) et non par capture
  d'écran d'une session authentifiée réelle, pour la même raison que
  ci-dessus (les pages `/app/*` exigent une session Supabase valide, absente
  dans cet environnement). Ne pas présenter cela comme une validation visuelle
  réelle.
- La garde de revue sur `systemDb` (Lot 1, toujours pas de règle de lint
  dédiée) s'applique aussi aux nouveaux imports du Lot 2 — aucun n'en a
  besoin, `tasks/service.ts` et `dashboard/service.ts` passent tous les deux
  par `withTenant`, jamais par `systemDb`.

## 14. Verdict

**Peut-on lancer le Lot 3 — Devis réels : OUI**, sous la même réserve qu'au
Lot 1 (protocole de validation cloud à exécuter avant mise en production).

Invariants que le Lot 3 doit conserver (en plus de ceux du Lot 1, toujours
valables) :

1. Toute nouvelle table métier porteuse d'un `organizationId` reçoit RLS +
   extension Prisma + tests cross-tenant **avant** d'être utilisée — jamais
   après.
2. Tout identifiant d'une autre entité reçu depuis un formulaire/`<select>`
   (ex. futur `clientId` sur un devis) doit être vérifié explicitement contre
   l'organisation courante côté service, comme `assertClientBelongsToOrg` —
   pas seulement confié à une contrainte FK ou à la RLS.
3. Aucune donnée financière n'apparaît dans l'UI tant qu'elle n'est pas
   réelle — pas de placeholder, pas de "à venir" chiffré.
4. Les dates métier ("aujourd'hui", "en retard", échéances) passent par
   `src/lib/datetime.ts` (convention Europe/Paris), jamais par `new Date()`
   nu dans une règle métier.
5. Le Dashboard reste agrégé par une fonction serveur unique par écran —
   pas de multiplication de requêtes séparées côté client à mesure que de
   nouvelles données (devis) viennent l'alimenter.
6. Les 81 tests actuels (Lot 1 + Lot 2) restent verts et bloquants en CI ;
   le statut "VALIDATION CLOUD REQUISE" reste affiché tant qu'un vrai projet
   Supabase n'a pas été testé selon le protocole documenté.
