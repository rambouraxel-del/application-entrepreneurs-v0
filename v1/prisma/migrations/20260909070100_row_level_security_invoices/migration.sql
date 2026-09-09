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

-- =============================================================================
-- Lot 4 — Factures et paiements (docs/v1/lot-4-factures-paiements.md)
-- =============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE  ROW LEVEL SECURITY;

-- Même policy que quotes. Le lien vers Client/Quote source n'est pas vérifié
-- ici : vérifié explicitement côté service AVANT écriture
-- (src/modules/invoices/service.ts) — la transformation Quote -> Invoice ne
-- peut créer une facture que pour un devis de la même organisation.
DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON invoice_lines;
CREATE POLICY tenant_isolation ON invoice_lines
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE  ROW LEVEL SECURITY;

-- L'appartenance de invoice_id à l'organisation courante est vérifiée
-- explicitement côté service avant toute écriture — même principe que
-- partout ailleurs (jamais seulement la RLS ou la contrainte FK). Test
-- explicite : "A ne peut pas créer de paiement sur la facture de B".
DROP POLICY IF EXISTS tenant_isolation ON payments;
CREATE POLICY tenant_isolation ON payments
  USING      (organization_id = app_current_org() AND app_is_member(organization_id))
  WITH CHECK (organization_id = app_current_org() AND app_is_member(organization_id));

-- --- Immutabilité d'une facture émise (même principe que Quote, §16) -------
-- Différence avec Quote : `InvoiceStatus` ne connaît que draft/issued — une
-- fois émise, AUCUNE transition de statut n'existe plus sur cette table (le
-- cycle de paiement est un axe séparé, porté par `Payment`, jamais une
-- colonne de `invoices`). Donc : dès que issued_at est posé, tout est figé
-- sauf pdf_path/pdf_sha256 — pas d'exception "transition autorisée" à coder.
CREATE OR REPLACE FUNCTION invoices_protect_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN
    IF NEW.issued_at            IS DISTINCT FROM OLD.issued_at
    OR NEW.number                IS DISTINCT FROM OLD.number
    OR NEW.status                IS DISTINCT FROM OLD.status
    OR NEW.organization_id       IS DISTINCT FROM OLD.organization_id
    OR NEW.client_id             IS DISTINCT FROM OLD.client_id
    OR NEW.source_quote_id       IS DISTINCT FROM OLD.source_quote_id
    OR NEW.supply_date           IS DISTINCT FROM OLD.supply_date
    OR NEW.due_date              IS DISTINCT FROM OLD.due_date
    OR NEW.operation_category    IS DISTINCT FROM OLD.operation_category
    OR NEW.purchase_order_number IS DISTINCT FROM OLD.purchase_order_number
    OR NEW.vat_on_debits         IS DISTINCT FROM OLD.vat_on_debits
    OR NEW.notes                 IS DISTINCT FROM OLD.notes
    OR NEW.issuer_snapshot       IS DISTINCT FROM OLD.issuer_snapshot
    OR NEW.client_snapshot       IS DISTINCT FROM OLD.client_snapshot
    OR NEW.payment_terms_snapshot IS DISTINCT FROM OLD.payment_terms_snapshot
    OR NEW.total_ht_cents        IS DISTINCT FROM OLD.total_ht_cents
    OR NEW.total_vat_cents       IS DISTINCT FROM OLD.total_vat_cents
    OR NEW.total_ttc_cents       IS DISTINCT FROM OLD.total_ttc_cents
    OR NEW.vat_breakdown         IS DISTINCT FROM OLD.vat_breakdown
    OR NEW.created_at            IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Facture émise : modification interdite (id=%)', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_protect_issued ON invoices;
CREATE TRIGGER invoices_protect_issued
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_protect_issued();

-- Suppression : un brouillon est jetable, une facture émise ne l'est plus
-- jamais (§17 — une correction future passera par un avoir, hors Lot 4).
CREATE OR REPLACE FUNCTION invoices_forbid_delete_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN
    RAISE EXCEPTION 'Facture émise : suppression interdite (id=%)', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS invoices_forbid_delete_issued ON invoices;
CREATE TRIGGER invoices_forbid_delete_issued
  BEFORE DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_forbid_delete_issued();

-- Lignes figées dès que la facture parente est émise — même principe que quote_lines.
CREATE OR REPLACE FUNCTION invoice_lines_protect_issued() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  invoice_issued_at timestamptz;
BEGIN
  SELECT issued_at INTO invoice_issued_at FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF invoice_issued_at IS NOT NULL THEN
    RAISE EXCEPTION 'Facture émise : lignes immuables (invoice_id=%)', COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS invoice_lines_protect_issued ON invoice_lines;
CREATE TRIGGER invoice_lines_protect_issued
  BEFORE INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION invoice_lines_protect_issued();

-- --- Paiements : fait traçable, jamais mutable ni supprimable (§33) --------
-- Seule mutation autorisée après création : poser cancelled_at/cancellation_reason
-- (une seule fois — annuler un paiement déjà annulé n'a pas de sens, mais on
-- ne bloque pas explicitement une double annulation idempotente : le service
-- s'en charge, voir modules/payments/service.ts).
CREATE OR REPLACE FUNCTION payments_protect_recorded() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.organization_id   IS DISTINCT FROM OLD.organization_id
  OR NEW.invoice_id         IS DISTINCT FROM OLD.invoice_id
  OR NEW.amount_cents       IS DISTINCT FROM OLD.amount_cents
  OR NEW.paid_at            IS DISTINCT FROM OLD.paid_at
  OR NEW.method             IS DISTINCT FROM OLD.method
  OR NEW.reference          IS DISTINCT FROM OLD.reference
  OR NEW.note               IS DISTINCT FROM OLD.note
  OR NEW.idempotency_key    IS DISTINCT FROM OLD.idempotency_key
  OR NEW.created_at         IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Paiement enregistré : seule une annulation est autorisée (id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_protect_recorded ON payments;
CREATE TRIGGER payments_protect_recorded
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_protect_recorded();

CREATE OR REPLACE FUNCTION payments_forbid_delete() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Paiement : suppression interdite, annuler à la place (id=%)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS payments_forbid_delete ON payments;
CREATE TRIGGER payments_forbid_delete
  BEFORE DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_forbid_delete();

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
