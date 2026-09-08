-- Rôles et base du spike. Exécuté par un superuser, une seule fois.
-- Mots de passe d'un spike local jetable : aucun secret réel.
DROP DATABASE IF EXISTS cockpit_spike;
DROP ROLE IF EXISTS spike_app;
DROP ROLE IF EXISTS spike_system;
DROP ROLE IF EXISTS spike_owner;

-- 1. PROPRIÉTAIRE : DDL et policies uniquement (migrations).
--    FORCE ROW LEVEL SECURITY s'applique aussi à lui : il ne peut pas lire ni
--    écrire de données métier sans contexte. C'est voulu.
CREATE ROLE spike_owner LOGIN PASSWORD 'spike';

-- 2. APPLICATIF : le seul rôle utilisé par le code métier.
--    NOSUPERUSER + NOBYPASSRLS + non propriétaire = la RLS s'applique vraiment.
CREATE ROLE spike_app LOGIN PASSWORD 'spike' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- 3. SYSTÈME : échappatoire assumée et isolée (inscription, webhooks, seed).
--    Découverte du Lot 0 : au moment de l'inscription, aucune organisation
--    n'existe encore et aucun contexte tenant ne peut être posé — il faut donc
--    un rôle capable de créer l'organisation et la première appartenance.
--    En V1 ce rôle est réservé à lib/db/system.ts, sous garde de lint et de test.
CREATE ROLE spike_system LOGIN PASSWORD 'spike' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;

CREATE DATABASE cockpit_spike OWNER spike_owner;
