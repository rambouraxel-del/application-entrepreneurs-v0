# `v1-spike/` — Lot 0, validation des fondations V1

> ⚠️ **RÉPERTOIRE TEMPORAIRE ET JETABLE.**
> Ce n'est pas la V1. C'est le code minimal écrit pour *prouver* que les
> décisions d'architecture les plus risquées fonctionnent réellement ensemble.
> Il peut être **supprimé intégralement** (`rm -rf v1-spike/`) sans aucun impact
> sur le prototype V0 : aucune ligne de la V0 n'en dépend, et il ne modifie ni
> `js/app.js`, ni les pages HTML, ni les CSS historiques.
>
> Conclusions et verdicts : **`../docs/v1/lot-0-validation.md`**.

## Ce qui est prouvé ici

| Spike | Question | Où |
|---|---|---|
| **A** | Isolation multi-tenant : Prisma + PostgreSQL RLS tiennent-ils ensemble ? | `tests/isolation.test.ts` (26 tests) |
| **B** | Numérotation financière concurrente sans collision ni trou ? | `tests/numbering.test.ts` (8 tests) |
| **C** | PDF généré, stocké, récupéré, et document historique immuable ? | `tests/documents.test.ts` (12 tests) |
| **Argent** | Convention monétaire exacte, sans flottant | `tests/money.test.ts` (14 tests) |

## Structure

```
src/
  db/client.ts        clients Prisma (applicatif / système) + extension tenant
  db/withTenant.ts    point d'accès unique : transaction + contexte RLS
  tenant/context.ts   TenantContext marqué — seul le résolveur peut en produire
  auth/session.ts     session → appartenances → organisation autorisée
  numbering/          allocation atomique de numéro + formatage
  money/              centimes entiers, arrondis, TVA, totaux
  documents/          gabarit PDF + port de stockage (adaptateur local)
prisma/
  schema.prisma       modèle MINIMAL du spike (≠ modèle V1)
  rls.sql             policies Row Level Security + droits des rôles
```

## Exécuter

Prérequis : un PostgreSQL joignable. Le spike a été validé sur PostgreSQL 16.

```bash
# 1. démarrer un PostgreSQL local (exemple, à adapter à votre poste)
initdb -D /tmp/pgspike/data -U postgres --auth=trust
pg_ctl -D /tmp/pgspike/data -o "-p 55432" -l /tmp/pgspike/server.log start

# 2. configurer et préparer la base
cp .env.example .env
npm install
npx prisma generate
node scripts/setup-db.mjs      # rôles → schéma → policies RLS

# 3. lancer les tests du spike
npm test
```

Les tests du spike sont **indépendants de ceux de la V0** : `npm test` à la
racine du dépôt exécute la V0 (`tests/*.test.js`), `npm test` ici exécute le
spike. Les deux ne se croisent jamais.

## Trois rôles PostgreSQL, et pourquoi

| Rôle | Usage | RLS |
|---|---|---|
| `spike_owner` | Propriétaire des tables, migrations et policies (DDL) | S'applique (`FORCE`) |
| `spike_app` | **Le seul rôle du code métier** | S'applique |
| `spike_system` | Inscription, webhooks, jeux de test — chemins sans contexte tenant possible | `BYPASSRLS` |

Le rôle système est la seule porte de sortie de la RLS. En V1 il est confiné à
`lib/db/system.ts`, sous garde de lint et de test.
