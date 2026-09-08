-- Rôles et base — développement local uniquement (Supabase gère ses propres
-- rôles en production : postgres/service_role en propriétaire, authenticated
-- en applicatif via PostgREST). Mots de passe d'un environnement local jetable.
--
-- Trois rôles, comme validé au Lot 0 (docs/v1/lot-0-validation.md §8.3) :
DROP DATABASE IF EXISTS cockpit_v1;
DROP ROLE IF EXISTS cockpit_app;
DROP ROLE IF EXISTS cockpit_system;
DROP ROLE IF EXISTS cockpit_owner;

-- 1. PROPRIÉTAIRE : migrations et policies uniquement. FORCE ROW LEVEL
--    SECURITY s'applique aussi à lui — il ne lit/écrit aucune donnée métier
--    sans contexte. C'est voulu.
CREATE ROLE cockpit_owner LOGIN PASSWORD 'cockpit' CREATEDB;

-- 2. APPLICATIF : le seul rôle utilisé par le code métier (src/lib/db/client.ts,
--    export `db`). NOSUPERUSER + NOBYPASSRLS + non propriétaire = la RLS
--    s'applique réellement.
CREATE ROLE cockpit_app LOGIN PASSWORD 'cockpit' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- 3. SYSTÈME : échappatoire assumée et confinée (src/lib/db/system.ts) —
--    inscription (l'organisation n'existe pas encore), seed, migrations
--    applicatives futures.
CREATE ROLE cockpit_system LOGIN PASSWORD 'cockpit' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;

CREATE DATABASE cockpit_v1 OWNER cockpit_owner;
