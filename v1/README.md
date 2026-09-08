# Cockpit Entrepreneur — V1 (socle)

Nouvelle application (Next.js + TypeScript + PostgreSQL/Prisma + Supabase
Auth), distincte de la V0 (`js/app.js`, pages HTML/CSS à la racine du dépôt),
qui continue de fonctionner indépendamment. Voir `docs/v1/lot-1-socle.md`
(socle) et `docs/v1/lot-2-clients-dashboard.md` (Clients réels + Dashboard)
pour les comptes rendus, et `docs/v1/architecture.md` pour la conception.

## Prérequis

- Node.js 22+
- PostgreSQL 16 accessible en local (port 5432)

## Démarrage local

```bash
npm install

# 1. Créer les 3 rôles PostgreSQL + la base (dev local uniquement —
#    Supabase gère ses propres rôles en production).
psql "postgresql://<user>:<password>@localhost:5432/postgres" -f prisma/bootstrap.sql

# 2. Copier et compléter les variables d'environnement.
cp .env.example .env
# DATABASE_URL_OWNER/APP/SYSTEM sont déjà pré-remplies pour la base locale
# créée à l'étape 1. Les variables NEXT_PUBLIC_SUPABASE_*/SUPABASE_SERVICE_ROLE_KEY
# peuvent rester vides : sans elles, l'app tourne quand même (pas de
# redirection d'auth forcée, stockage local pour les fichiers).

# 3. Générer le client Prisma et appliquer les migrations (schéma + RLS).
npm run db:generate
npm run db:migrate

# 4. Peupler une base de démo (2 organisations, clients + tâches variés).
npm run db:seed

# 5. Lancer l'app.
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test
```

81 tests contre une vraie base PostgreSQL locale (isolation multi-tenant
Client + Task, CRUD, moteur d'insights, agrégats Dashboard, résolution de
session/organisation) — voir `docs/v1/lot-2-clients-dashboard.md` §10.

## Autres commandes

```bash
npm run lint            # ESLint
npx tsc --noEmit         # Typecheck
npm run build            # Build production
npm run db:migrate:dev  # Nouvelle migration en développement (prisma migrate dev)
```

## Ce que la V1 contient (et ne contient pas encore)

Contient : authentification (Supabase Auth), Organizations/Memberships,
isolation multi-tenant (extension Prisma + Row Level Security PostgreSQL),
Client (CRUD complet, statuts CRM, notes, dernier contact), Task (relances
liées ou non à un client), un Dashboard réel branché sur PostgreSQL (aucune
donnée financière), un moteur d'insights V1, un branchement Supabase Storage
(logo d'organisation, avec repli local en dev).

Ne contient pas (volontairement, prochains lots) : devis, factures,
paiements, trésorerie, numérotation, PDF, Stripe, facturation électronique,
agenda/calendrier, moteur d'insights complet, page Analyses.

## Variables d'environnement Supabase

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` n'ont pas pu être validées contre un vrai projet
Supabase dans l'environnement où ce socle a été construit (aucun
credential disponible). Le code d'intégration est réel et complet ; le
protocole de validation manuelle à exécuter avant mise en production est
décrit dans `docs/v1/lot-1-socle.md` §13 ("VALIDATION CLOUD REQUISE").
