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

-- =============================================================================
-- Lot 3 — Devis (docs/v1/lot-3-devis.md)
-- =============================================================================

ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_counters FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON document_counters;
CREATE POLICY tenant_isolation ON document_counters
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE  ROW LEVEL SECURITY;

-- Même policy que clients/tasks. Le lien vers Client (clientId) n'est pas
-- vérifié ici : vérifié explicitement côté service AVANT écriture
-- (src/modules/quotes/service.ts::assertClientBelongsToOrg, réutilisé de
-- clients/service.ts) — un test explicite couvre "A ne peut pas créer de
-- devis pour le Client de B", même en connaissant son UUID.
DROP POLICY IF EXISTS tenant_isolation ON quotes;
CREATE POLICY tenant_isolation ON quotes
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines FORCE  ROW LEVEL SECURITY;

-- organization_id dénormalisé sur quote_lines pour la même policy simple.
-- L'appartenance du quote_id à l'organisation courante (et son statut
-- brouillon) est vérifiée explicitement côté service avant toute écriture de
-- ligne — jamais seulement par cette policy ou la contrainte FK.
DROP POLICY IF EXISTS tenant_isolation ON quote_lines;
CREATE POLICY tenant_isolation ON quote_lines
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

-- --- Immutabilité d'un devis émis (docs/v1/architecture.md §9.2) -----------
-- Le Lot 0 avait démontré le principe sur un document jetable (spike) sans
-- porter le trigger en base — explicitement noté comme priorité du Lot 1
-- (lot-0-validation.md §7.3). Il n'y avait encore aucun document réellement
-- "émis" à protéger avant ce Lot 3 : implémenté ici, à la première occasion
-- utile, comme prévu.
--
-- Principe : tant que issued_at IS NULL (brouillon), tout est modifiable.
-- Dès que issued_at est posé, PLUS AUCUNE colonne "de fond" ne peut changer
-- — seules les transitions de statut autorisées (sent -> accepted/rejected/
-- expired) et la régénération du PDF (pdf_path/pdf_sha256) restent permises.
-- Appliqué EN BASE : un bug applicatif ne peut pas la contourner (c'est
-- précisément le point du trigger, pas une simple discipline de code).
CREATE OR REPLACE FUNCTION quotes_protect_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN
    IF NEW.issued_at         IS DISTINCT FROM OLD.issued_at
    OR NEW.number            IS DISTINCT FROM OLD.number
    OR NEW.organization_id   IS DISTINCT FROM OLD.organization_id
    OR NEW.client_id         IS DISTINCT FROM OLD.client_id
    OR NEW.valid_until       IS DISTINCT FROM OLD.valid_until
    OR NEW.notes             IS DISTINCT FROM OLD.notes
    OR NEW.client_snapshot        IS DISTINCT FROM OLD.client_snapshot
    OR NEW.organization_snapshot  IS DISTINCT FROM OLD.organization_snapshot
    OR NEW.total_ht_cents    IS DISTINCT FROM OLD.total_ht_cents
    OR NEW.total_vat_cents   IS DISTINCT FROM OLD.total_vat_cents
    OR NEW.total_ttc_cents   IS DISTINCT FROM OLD.total_ttc_cents
    OR NEW.vat_breakdown     IS DISTINCT FROM OLD.vat_breakdown
    OR NEW.created_at        IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Devis émis : modification interdite (id=%)', OLD.id;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'sent' AND NEW.status IN ('accepted', 'rejected', 'expired'))
    THEN
      RAISE EXCEPTION 'Devis émis : transition de statut interdite (% -> %)', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quotes_protect_issued ON quotes;
CREATE TRIGGER quotes_protect_issued
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_protect_issued();

-- Suppression : un brouillon est jetable (rien n'y fait encore référence),
-- un devis émis ne l'est plus jamais — même règle que la modification.
CREATE OR REPLACE FUNCTION quotes_forbid_delete_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN
    RAISE EXCEPTION 'Devis émis : suppression interdite (id=%)', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS quotes_forbid_delete_issued ON quotes;
CREATE TRIGGER quotes_forbid_delete_issued
  BEFORE DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_forbid_delete_issued();

-- Les lignes d'un devis émis sont entièrement figées : aucun ajout, aucune
-- modification, aucune suppression. C'est ce qui rend le montant historique
-- reproductible sans dupliquer les lignes dans un snapshot JSON séparé.
CREATE OR REPLACE FUNCTION quote_lines_protect_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  quote_issued_at timestamptz;
BEGIN
  SELECT issued_at INTO quote_issued_at FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  IF quote_issued_at IS NOT NULL THEN
    RAISE EXCEPTION 'Devis émis : lignes immuables (quote_id=%)', COALESCE(NEW.quote_id, OLD.quote_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS quote_lines_protect_issued ON quote_lines;
CREATE TRIGGER quote_lines_protect_issued
  BEFORE INSERT OR UPDATE OR DELETE ON quote_lines
  FOR EACH ROW EXECUTE FUNCTION quote_lines_protect_issued();

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
