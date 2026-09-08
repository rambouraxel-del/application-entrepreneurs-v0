# Lot 1 — Socle V1 (compte rendu)

> Suite du Lot 0 (`lot-0-validation.md`). Le Lot 0 avait *prouvé* les décisions
> risquées sur un spike jetable (`v1-spike/`, conservé pour référence). Le
> Lot 1 construit la vraie application, `v1/` : Next.js + TypeScript, une
> vraie base PostgreSQL locale avec Prisma, une vraie intégration Supabase
> Auth, Organizations/Memberships, isolation multi-tenant réelle (extension
> Prisma + RLS), un premier objet métier (`Client`) en CRUD complet, un
> branchement Supabase Storage réel (logo d'organisation), CI, lint,
> typecheck, tests.
>
> **Ce n'est pas encore le produit.** Ni devis, ni factures, ni paiements, ni
> numérotation, ni PDF, ni Dashboard décisionnel. Uniquement le socle sur
> lequel ces briques viendront se poser.

---

## 1. Résumé

Le socle est construit, testé localement (33 tests automatisés, tous verts),
et le typecheck/lint/build passent proprement. La partie qui dépend d'un
projet Supabase réel (Auth, Storage cloud) est codée avec le vrai SDK
officiel mais **n'a pas pu être exécutée contre un projet Supabase réel**
dans cet environnement (aucun credential disponible) — voir §9 et §13.
Verdict complet en §15.

## 2. Structure créée

```
v1/
  prisma/
    schema.prisma          # Organization, Membership, Client
    bootstrap.sql           # 3 rôles Postgres + base (dev local)
    rls.sql                  # policies RLS (source, copiée dans une migration)
    seed.ts                  # jeu de données de démo (2 orgs, 3 clients)
    migrations/               # migrations versionnées (schéma + RLS)
  src/
    lib/
      db/          client.ts (appDb + extension tenant), system.ts (systemDb, BYPASSRLS), withTenant.ts
      tenant/      context.ts (TenantContext marqué, erreurs)
      supabase/    server.ts, client.ts, middleware.ts (@supabase/ssr)
      storage/     storage.ts (SupabaseStorage réel + LocalDocumentStorage fallback)
    modules/
      auth/        session.ts, actions.ts (signUp/signIn/signOut/reset)
      organizations/ service.ts (résolution du contexte tenant, création à l'inscription)
      clients/     validation.ts, repository.ts, service.ts, actions.ts, ClientForm.tsx
    app/           pages : /, /login, /signup, /reset-password, /app/*, /app/clients/*
  tests/           isolation.test.ts, clients.test.ts, organizations.test.ts, helpers.ts, setup.ts
  middleware.ts    rafraîchissement de session Supabase
  .env.example
```

Rien dans `js/app.js`, les pages HTML V0 ou les CSS V0 n'a été touché. La V0
continue de fonctionner indépendamment.

## 3. Authentification

Déléguée à **Supabase Auth** via `@supabase/ssr` (`createServerClient` /
`createBrowserClient`), conformément à `architecture.md` §7 (ADR-05). Aucun
système de mot de passe maison, aucun stockage artisanal de jeton — les
cookies de session sont gérés par le SDK officiel.

- `src/modules/auth/actions.ts` : `signUp`, `signIn`, `signOut`,
  `requestPasswordReset`, tous en Server Actions, validation Zod en entrée.
- Message d'erreur générique à la connexion ("E-mail ou mot de passe
  incorrect") et `requestPasswordReset` renvoie toujours un succès apparent
  — anti-énumération de comptes, volontaire.
- `getSession()` utilise `supabase.auth.getUser()` (revalide auprès du
  serveur Supabase), jamais `getSession()` seul qui ne fait que lire les
  cookies.
- `middleware.ts` rafraîchit la session à chaque requête et redirige vers
  `/login` les accès non authentifiés à `/app/*`.

**VALIDATION CLOUD REQUISE** : ce code est réel et complet, mais n'a jamais
tourné contre un vrai projet Supabase (aucun credential dans cet
environnement). Voir §13 pour le protocole de validation manuelle.

## 4. Organizations / Memberships

- `Organization` : tenant. `Membership` : lien utilisateur ↔ organisation
  (`role`, par défaut `owner`).
- **Pas de table `users` locale** (déviation documentée : `architecture.md`
  ADR-15, `data-model.md`). `Membership.userId` porte directement l'UUID
  Supabase Auth. Décision réversible — cette table pourra être ajoutée dès
  qu'un champ propre à l'utilisateur sera nécessaire, sans rien casser.
- `createOrganizationForNewUser` crée l'organisation ET le premier
  membership dans une même transaction système (BYPASSRLS) — le seul cas où
  aucun contexte tenant ne peut encore exister.
- `resolveDefaultTenantContext` : résout la première organisation d'un
  utilisateur (un utilisateur = une organisation au Lot 1 ; le modèle
  autorise déjà plusieurs organisations pour un futur sélecteur, non
  construit ici).

## 5. Multi-tenancy

Deux couches superposées, volontairement redondantes (Lot 0 §3) :

1. **Extension Prisma** (`src/lib/db/client.ts`) : injecte/vérifie
   `organizationId` sur les opérations du modèle `Client`. Sur les lectures,
   un `organizationId` étranger fourni par erreur est silencieusement
   écrasé par celui du contexte (sans risque : la lecture reste bornée).
   Sur les écritures (create/update/delete/upsert), un `organizationId`
   étranger fait lever `TenantScopeViolationError` — l'intention doit être
   rejetée bruyamment.
2. **Row Level Security PostgreSQL** — la barrière finale, qui s'applique
   même si l'extension est contournée (SQL brut, oubli de couche).

`organizationId` n'est **jamais** lu depuis le navigateur : `withTenant()`
exige un `TenantContext`, un type marqué (`unique symbol`) dont le seul
producteur légitime hors tests est `resolveTenantContext()`, qui vérifie
l'appartenance réelle en base avant de le construire.

## 6. RLS

Trois rôles PostgreSQL, comme validé au Lot 0 :

- `cockpit_owner` : DDL/migrations (CREATEDB, propriétaire).
- `cockpit_app` : seul rôle utilisé par le code métier. `NOBYPASSRLS` — la
  RLS s'applique réellement, y compris à lui-même via `FORCE ROW LEVEL
  SECURITY`.
- `cockpit_system` : `BYPASSRLS`, confiné à l'inscription et au seed
  (`src/lib/db/system.ts`, garde de revue documentée en attendant une règle
  de lint dédiée — voir §14).

Policies (`prisma/rls.sql`, appliquées par migration) :
- `clients` : `organization_id = app_current_org() AND app_is_member(organization_id)`
  — vérifie à la fois le contexte ET une appartenance réelle (le défaut
  trouvé au Lot 0 : une policy qui vérifie seulement l'organisation confine
  sans authentifier).
- `organizations` : `app_is_member(id)`.
- `memberships` : `user_id = app_current_user()`.

Contexte posé par `set_config('app.organization_id'/'app.user_id', …, true)`
— **portée transaction**, jamais session (fuite possible via un pool
recyclé sinon).

Vérifié end-to-end : `prisma migrate deploy` depuis une base vide applique
les deux migrations (schéma puis RLS) dans l'ordre, sans erreur.

## 7. Prisma

- Migrations versionnées (`prisma migrate deploy`/`dev`), jamais `db push`
  en stratégie définitive.
- `appDb` (rôle applicatif) et `systemDb` (rôle système) sont deux clients
  Prisma distincts, jamais interchangés.
- Un service ne parle jamais à Prisma directement : `service → repository →
  TenantScopedClient` (fourni uniquement par `withTenant`).

## 8. Client (premier objet métier)

Volontairement minimal (`docs/mvp-commercial.md`) : `kind`
(individual/company), `name`, `companyName`, `email`, `phone`, `status`
(prospect/active/archived). Pas d'historique, pas de documents liés, pas de
statistiques, pas de CRM avancé.

**Suppression = archivage**, jamais de suppression physique — le choix le
plus simple et le plus réversible, et qui évite le problème d'un client
supprimé alors que devis/factures y feront référence dans un lot ultérieur.

CRUD complet exposé via Server Actions (`create/update/archive/restore`),
séquence imposée partout : authentifier → résoudre le contexte tenant →
valider (Zod) → service → repository.

## 9. Storage

- `SupabaseStorage` : implémentation réelle (`@supabase/supabase-js`,
  clé service-role, appels `upload/createSignedUrl/remove` sur le bucket
  `org-logos`). **VALIDATION CLOUD REQUISE** — jamais exécutée contre un
  vrai bucket.
- `LocalDocumentStorage` : repli filesystem (protégé contre la traversée de
  chemin, URLs signées HMAC-SHA256) utilisé automatiquement en local/tests
  quand les variables Supabase sont absentes — porté du spike Lot 0.
- `resolveDocumentStorage()` choisit l'un ou l'autre selon la présence des
  variables d'environnement.
- Seul le logo d'organisation est branché — pas de PDF/factures à ce stade,
  volontairement (suffisant pour valider le branchement cloud).

## 10. CI

`.github/workflows/v1-ci.yml`, scopée à `v1/**` (ne se déclenche jamais sur
des changements V0 seuls) :
install → lint → typecheck → (service PostgreSQL 16) bootstrap des 3 rôles
→ migrations → **tests** (isolation tenant incluse, bloquante) → build.

Aucune étape ne dépend de credentials Supabase — le repli local suffit pour
que la CI reste 100% reproductible sans compte cloud.

**Règles de protection de branche recommandées** (à activer manuellement
dans les réglages GitHub — non modifiables depuis le dépôt) : `main`
protégée, pull request obligatoire, ce workflow requis avant fusion,
branches courtes.

## 11. Tests

33 tests Vitest, exécution série contre une vraie base PostgreSQL locale
(même choix qu'au Lot 0 : `fileParallelism: false`) :

- `tests/isolation.test.ts` (18) : lecture/écriture/suppression/création
  croisées A/B, absence de contexte, contournement SQL brut, contexte forgé
  (`{userA, orgB}` — refusé par la RLS malgré une fabrication directe côté
  test).
- `tests/clients.test.ts` (9) : CRUD via le service, validation Zod,
  archivage/restauration, non-suppression physique.
- `tests/organizations.test.ts` (6) : résolution du contexte tenant,
  refus d'une organisation dont l'utilisateur n'est pas membre (y compris
  un identifiant malformé ou inexistant), résolution par défaut.

Non couvert automatiquement (nécessite un vrai projet Supabase) :
authentification réelle de bout en bout, upload Storage cloud. Voir §13.

## 12. Fichiers/dossiers créés

Voir arborescence §2. Rien en dehors de `v1/` sauf : `.github/workflows/v1-ci.yml`
(nouveau), `docs/v1/lot-1-socle.md` (ce fichier), une note ajoutée à
`docs/v1/architecture.md` (ADR-15) et `docs/v1/data-model.md` (`users`
reportée).

## 13. VALIDATION CLOUD REQUISE — protocole manuel

Aucun credential Supabase n'était disponible dans cet environnement. Le code
(Auth + Storage) est réel et complet, mais non exécuté contre un projet
réel. Protocole reproductible pour la validation manuelle :

1. Créer un projet Supabase, copier `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dans `.env`.
2. Créer le bucket `org-logos` (privé) dans Supabase Storage.
3. `npm run dev`, aller sur `/signup`, créer un compte, vérifier la
   redirection `?confirm=1` si la confirmation e-mail est activée sur le
   projet, confirmer via le lien reçu, se connecter sur `/login`.
4. Vérifier qu'un utilisateur B (deuxième compte) ne voit jamais les
   clients créés par le compte A (répète manuellement le scénario A/B des
   tests automatisés, mais via de vraies sessions HTTP).
5. Une fois le Storage branché : uploader un logo, vérifier que l'URL
   signée expire et que le fichier n'est pas accessible sans elle.

Tant que ce protocole n'a pas été exécuté au moins une fois contre un projet
réel, l'intégration Supabase reste **non validée**, même si le code est
prêt.

## 14. Limites connues

- La confinement de `systemDb` (BYPASSRLS) aux trois usages légitimes
  (inscription, seed, tests) repose sur une **garde de revue documentée**,
  pas sur une règle de lint automatisée — un import supplémentaire ne serait
  pas bloqué mécaniquement aujourd'hui.
- `TENANT_SCOPED_MODELS` (extension Prisma) doit être mise à jour à la main
  à chaque nouveau modèle porteur d'un `organizationId` — oubli possible ;
  la RLS reste le filet de sécurité si ça arrive.
- Auth et Storage cloud : voir §13, non exécutés contre un vrai projet.
- Un seul rôle (`owner`) existe réellement dans `Membership.role` — pas de
  gestion fine des permissions au Lot 1 (hors périmètre).

## 15. Verdict

**Le socle V1 est-il suffisamment fiable pour commencer le Lot 2 : OUI.**

Sous réserve du protocole §13 exécuté avant toute mise en production réelle
(le socle technique est prêt, sa validation contre un vrai projet Supabase
ne l'est pas encore).

Invariants que le Lot 2 ne doit jamais casser :

1. Aucune mutation ne doit accéder à Prisma sans passer par
   `withTenant(ctx, …)` avec un `TenantContext` obtenu via
   `resolveTenantContext`/`resolveDefaultTenantContext` — jamais fabriqué à
   la main hors tests.
2. Tout nouveau modèle porteur d'un `organizationId` doit être ajouté à
   `TENANT_SCOPED_MODELS` **et** recevoir une policy RLS
   (`organization_id = app_current_org() AND app_is_member(...)`) dans une
   migration dédiée — les deux, jamais l'un sans l'autre.
3. `systemDb` (BYPASSRLS) reste confiné à l'inscription, au seed et aux
   tests. Aucun nouveau module métier ne doit l'importer.
4. `organizationId` reste toujours dérivé côté serveur ; toute valeur reçue
   d'un formulaire est un signal d'alerte (voir
   `clientFormShouldNotContainOrganizationId`, à répliquer pour tout futur
   module).
5. Les migrations restent versionnées (`prisma migrate dev/deploy`) —
   jamais `db push` en stratégie définitive.
6. La suite `tests/isolation.test.ts` (ou son équivalent étendu) reste
   bloquante en CI à chaque nouveau module métier.
