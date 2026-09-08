-- Lot 3 : Devis (Quote/QuoteLine), compteur de numérotation transactionnel
-- (DocumentCounter), seuils Organization. Voir docs/v1/lot-3-devis.md.

-- --- Nettoyage mineur hérité du Lot 2 (repéré par `prisma migrate diff`) ----
-- Index simple devenu redondant : remplacé par les deux index composés créés
-- au Lot 2 (organization_id, status) et (organization_id, last_contact_at).
DROP INDEX IF EXISTS "clients_organization_id_idx";
-- Défaut DB oublié sur tasks.id (Prisma génère les UUID côté application,
-- comme pour toutes les autres tables) — alignement, aucun effet fonctionnel.
ALTER TABLE "tasks" ALTER COLUMN "id" DROP DEFAULT;

-- --- Organization : seuils devis ---------------------------------------
ALTER TABLE "organizations" ADD COLUMN "quote_follow_up_days" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "organizations" ADD COLUMN "quote_high_value_cents" INTEGER NOT NULL DEFAULT 500000;

-- --- DocumentCounter ------------------------------------------------------
CREATE TABLE "document_counters" (
    "organization_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("organization_id","doc_type","year")
);
ALTER TABLE "document_counters" ADD CONSTRAINT "document_counters_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- --- Quote ------------------------------------------------------------
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "number" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "issued_at" TIMESTAMP(3),
    "valid_until" DATE,
    "notes" TEXT,
    "client_snapshot" JSONB,
    "organization_snapshot" JSONB,
    "total_ht_cents" INTEGER NOT NULL DEFAULT 0,
    "total_vat_cents" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_breakdown" JSONB NOT NULL DEFAULT '[]',
    "pdf_path" TEXT,
    "pdf_sha256" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotes_organization_id_status_idx" ON "quotes"("organization_id", "status");
CREATE INDEX "quotes_organization_id_client_id_idx" ON "quotes"("organization_id", "client_id");
CREATE INDEX "quotes_organization_id_issued_at_idx" ON "quotes"("organization_id", "issued_at");
CREATE UNIQUE INDEX "quotes_organization_id_number_key" ON "quotes"("organization_id", "number");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- --- QuoteLine ----------------------------------------------------------
CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity_milli" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "discount_bp" INTEGER NOT NULL DEFAULT 0,
    "gross_ht_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL,
    "net_ht_cents" INTEGER NOT NULL,
    "vat_cents" INTEGER NOT NULL,
    "total_ttc_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quote_lines_quote_id_position_idx" ON "quote_lines"("quote_id", "position");

ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
