-- =============================================================================
-- Spike Lot 0 — Row Level Security PostgreSQL
-- =============================================================================
-- Objectif : prouver qu'une requête qui contournerait le filtrage applicatif
-- (SQL brut, oubli du where, relation imbriquée) reste bloquée par la base.
--
-- Mécanisme de transmission du tenant retenu et testé : variable de
-- configuration TRANSACTIONNELLE, posée avec set_config(..., is_local => true)
-- à l'ouverture de chaque transaction applicative.
--
-- Pourquoi ce mécanisme plutôt qu'un autre :
--   * claims JWT / auth.uid() : ne fonctionne qu'à travers PostgREST (client
--     Supabase). Prisma ouvre une connexion PostgreSQL directe : les claims
--     n'existent pas dans cette session. Écarté.
--   * SET (portée session) : avec un pool de connexions, la valeur SURVIT à la
--     requête et peut fuiter vers la requête suivante d'un AUTRE tenant.
--     Dangereux. Écarté explicitement.
--   * set_config(..., true) (portée transaction) : annulé automatiquement au
--     COMMIT comme au ROLLBACK, donc impossible à faire fuiter entre deux
--     requêtes. RETENU.
--
-- set_config() est utilisé plutôt que « SET LOCAL x = '...' » car SET
-- n'accepte pas de paramètre lié : construire la commande par concaténation
-- ouvrirait une injection SQL. set_config($1) est paramétrable.
-- =============================================================================

-- --- Helpers de contexte -----------------------------------------------------
-- nullif(..., '') : une variable absente ou vide devient NULL, et toute
-- comparaison « colonne = NULL » est fausse → aucune ligne visible.
-- C'est le comportement voulu : en l'absence de contexte, on ne voit RIEN.

CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.organization_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- Découverte du Lot 0 : comparer organization_id à app.organization_id ne
-- CONFINE que la requête ; cela n'AUTORISE rien. Un contexte fabriqué en code
-- (utilisateur A + organisation B) passait à travers.
-- La policy exige donc aussi une appartenance réelle : la base cesse de faire
-- confiance à la variable posée par l'application.
CREATE OR REPLACE FUNCTION app_is_member(org uuid) RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT EXISTS (
     SELECT 1 FROM memberships m
     WHERE m.organization_id = org AND m.user_id = app_current_user()
   ) $$;

-- --- Tables scopées par ORGANISATION ----------------------------------------
-- FORCE ROW LEVEL SECURITY : sans lui, le PROPRIÉTAIRE de la table échappe aux
-- policies. C'est le piège classique de la RLS — on le neutralise ici.

ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             FORCE  ROW LEVEL SECURITY;
ALTER TABLE issued_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_documents    FORCE  ROW LEVEL SECURITY;
ALTER TABLE document_counters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_counters   FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))   -- lecture / update / delete
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));  -- insert / résultat d'update

DROP POLICY IF EXISTS tenant_isolation ON issued_documents;
CREATE POLICY tenant_isolation ON issued_documents
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

DROP POLICY IF EXISTS tenant_isolation ON document_counters;
CREATE POLICY tenant_isolation ON document_counters
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

-- --- Tables scopées par UTILISATEUR -----------------------------------------
-- memberships doit rester lisible AVANT que l'organisation courante soit
-- connue : c'est lui qui autorise l'organisation. Il est donc scopé par
-- utilisateur, pas par organisation.

ALTER TABLE memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships   FORCE  ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         FORCE  ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_memberships ON memberships;
CREATE POLICY own_memberships ON memberships
  USING      (user_id = app_current_user())
  WITH CHECK (user_id = app_current_user());

DROP POLICY IF EXISTS own_user ON users;
CREATE POLICY own_user ON users
  USING      (id = app_current_user())
  WITH CHECK (id = app_current_user());

-- Une organisation n'est visible que si l'utilisateur courant en est membre.
DROP POLICY IF EXISTS member_organizations ON organizations;
CREATE POLICY member_organizations ON organizations
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organizations.id
      AND m.user_id = app_current_user()
  ));

-- --- Droits du rôle applicatif ----------------------------------------------
-- spike_app n'est ni superuser, ni propriétaire des tables, et n'a pas
-- BYPASSRLS : ce sont les trois conditions pour que la RLS s'applique
-- réellement. Un superuser passerait à travers toutes les policies.

GRANT USAGE ON SCHEMA public TO spike_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO spike_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO spike_app;
GRANT EXECUTE ON FUNCTION app_current_org()  TO spike_app;
GRANT EXECUTE ON FUNCTION app_current_user() TO spike_app;
GRANT EXECUTE ON FUNCTION app_is_member(uuid)  TO spike_app;

-- Rôle système : BYPASSRLS, réservé aux chemins qui ne PEUVENT pas avoir de
-- contexte tenant (inscription, webhooks de paiement, jeux de test).
-- Chaque usage doit être justifié — c'est la seule porte de sortie de la RLS.
GRANT USAGE ON SCHEMA public TO spike_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO spike_system;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO spike_system;
