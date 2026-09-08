-- =============================================================================
-- Cockpit Entrepreneur V1 — Row Level Security PostgreSQL
-- =============================================================================
-- Reprend tel quel le mécanisme éprouvé par 60 tests dans le Lot 0
-- (docs/v1/lot-0-validation.md). Ne réinvente rien : porte.
--
-- Transmission du tenant : set_config(..., is_local => true), portée
-- TRANSACTION — annulée au COMMIT comme au ROLLBACK, ne peut donc pas fuiter
-- entre deux requêtes d'un pool de connexions. `SET` de portée session est
-- proscrit pour cette raison. `set_config` accepte un paramètre lié : pas de
-- concaténation, donc pas d'injection SQL.
--
-- La policy exige la concordance d'organisation ET l'appartenance réelle de
-- l'utilisateur (app_is_member) : découverte du Lot 0 — une policy limitée à
-- « organization_id = organisation courante » CONFINE une requête mais
-- n'AUTORISE rien ; un contexte tenant fabriqué en code la traversait.
-- =============================================================================

CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.organization_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_is_member(org uuid) RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT EXISTS (
     SELECT 1 FROM memberships m
     WHERE m.organization_id = org AND m.user_id = app_current_user()
   ) $$;

-- --- Tables scopées par ORGANISATION ----------------------------------------
-- FORCE ROW LEVEL SECURITY : sans lui, le PROPRIÉTAIRE de la table échappe aux
-- policies (piège découvert au Lot 0). C'est pour cela qu'un rôle système
-- distinct existe (voir bootstrap.sql).

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE  ROW LEVEL SECURITY;

-- Une organisation n'est visible/modifiable que si l'utilisateur en est membre.
-- (Pas de contexte app.organization_id requis ici : c'est justement cette table
-- qui sert à le résoudre — cf. resolveTenantContext.)
DROP POLICY IF EXISTS member_organizations ON organizations;
CREATE POLICY member_organizations ON organizations
  USING      (app_is_member(id))
  WITH CHECK (app_is_member(id));

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE  ROW LEVEL SECURITY;

-- Un utilisateur ne voit que ses propres appartenances. L'INSERT (création
-- d'organisation) est fait par le rôle système (bypass RLS) : voir
-- organizations/service.ts — aucun contexte tenant n'existe encore à cet instant.
DROP POLICY IF EXISTS own_memberships ON memberships;
CREATE POLICY own_memberships ON memberships
  USING      (user_id = app_current_user())
  WITH CHECK (user_id = app_current_user());

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE  ROW LEVEL SECURITY;

-- Même policy que clients (organisation ET appartenance réelle) — ajoutée au
-- Lot 2 (docs/v1/lot-2-clients-dashboard.md §Multi-tenancy). Le lien vers
-- Client (clientId) n'est PAS vérifié ici : la RLS de `clients` empêcherait de
-- toute façon de lire un client d'une autre organisation, mais l'appartenance
-- du client au moment de la création est vérifiée côté service
-- (src/modules/tasks/service.ts), pas seulement par la DB — un test explicite
-- couvre ce cas (A ne peut pas créer de tâche liée au client de B).
DROP POLICY IF EXISTS tenant_isolation ON tasks;
CREATE POLICY tenant_isolation ON tasks
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

-- --- Droits des rôles applicatifs -------------------------------------------

GRANT USAGE ON SCHEMA public TO cockpit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cockpit_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cockpit_app;
GRANT EXECUTE ON FUNCTION app_current_org()   TO cockpit_app;
GRANT EXECUTE ON FUNCTION app_current_user()  TO cockpit_app;
GRANT EXECUTE ON FUNCTION app_is_member(uuid) TO cockpit_app;

-- Rôle système : BYPASSRLS, réservé aux chemins où aucun contexte tenant ne
-- peut exister (inscription : l'organisation n'existe pas encore), aux
-- migrations et au seed. Toute utilisation doit rester confinée à
-- src/lib/db/system.ts (garde de revue, cf. docs/v1/lot-1-socle.md).
GRANT USAGE ON SCHEMA public TO cockpit_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cockpit_system;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cockpit_system;
