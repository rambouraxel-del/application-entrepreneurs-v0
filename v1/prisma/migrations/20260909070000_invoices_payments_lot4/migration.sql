-- Lot 4 : identité légale Organization/Client, Invoice/InvoiceLine/Payment.
-- Voir docs/v1/lot-4-factures-paiements.md.

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('normal', 'franchise_en_base');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued');

-- CreateEnum
CREATE TYPE "OperationCategory" AS ENUM ('goods', 'services', 'mixed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'card', 'cash', 'check', 'direct_debit', 'other');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "billing_address_city" TEXT,
ADD COLUMN     "billing_address_country" TEXT,
ADD COLUMN     "billing_address_line1" TEXT,
ADD COLUMN     "billing_address_line2" TEXT,
ADD COLUMN     "billing_address_postal_code" TEXT,
ADD COLUMN     "billing_email" TEXT,
ADD COLUMN     "billing_legal_name" TEXT,
ADD COLUMN     "delivery_address_city" TEXT,
ADD COLUMN     "delivery_address_country" TEXT,
ADD COLUMN     "delivery_address_line1" TEXT,
ADD COLUMN     "delivery_address_line2" TEXT,
ADD COLUMN     "delivery_address_postal_code" TEXT,
ADD COLUMN     "siren" VARCHAR(9),
ADD COLUMN     "vat_number" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address_city" TEXT,
ADD COLUMN     "address_country" TEXT NOT NULL DEFAULT 'FR',
ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "address_postal_code" TEXT,
ADD COLUMN     "default_payment_term_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "early_payment_discount_text" TEXT NOT NULL DEFAULT 'Pas d''escompte pour paiement anticipé.',
ADD COLUMN     "late_payment_penalty_text" TEXT NOT NULL DEFAULT 'Taux de pénalité : 3 fois le taux d''intérêt légal.',
ADD COLUMN     "late_payment_recovery_fee_cents" INTEGER NOT NULL DEFAULT 4000,
ADD COLUMN     "legal_form" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "professional_email" TEXT,
ADD COLUMN     "professional_phone" TEXT,
ADD COLUMN     "siren" VARCHAR(9),
ADD COLUMN     "siret" VARCHAR(14),
ADD COLUMN     "trade_name" TEXT,
ADD COLUMN     "vat_number" TEXT,
ADD COLUMN     "vat_on_debits" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vat_regime" "VatRegime" NOT NULL DEFAULT 'normal';

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "source_quote_id" UUID,
    "number" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "issued_at" TIMESTAMP(3),
    "supply_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "operation_category" "OperationCategory" NOT NULL DEFAULT 'services',
    "purchase_order_number" TEXT,
    "vat_on_debits" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "issuer_snapshot" JSONB,
    "client_snapshot" JSONB,
    "payment_terms_snapshot" JSONB,
    "total_ht_cents" INTEGER NOT NULL DEFAULT 0,
    "total_vat_cents" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_cents" INTEGER NOT NULL DEFAULT 0,
    "vat_breakdown" JSONB NOT NULL DEFAULT '[]',
    "pdf_path" TEXT,
    "pdf_sha256" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity_milli" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "discount_bp" INTEGER NOT NULL DEFAULT 0,
    "vat_exemption_code" TEXT,
    "vat_legal_notice" TEXT,
    "gross_ht_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL,
    "net_ht_cents" INTEGER NOT NULL,
    "vat_cents" INTEGER NOT NULL,
    "total_ttc_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "paid_at" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT,
    "note" TEXT,
    "idempotency_key" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_source_quote_id_key" ON "invoices"("source_quote_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_status_idx" ON "invoices"("organization_id", "status");

-- CreateIndex
CREATE INDEX "invoices_organization_id_client_id_idx" ON "invoices"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_issued_at_idx" ON "invoices"("organization_id", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_organization_id_due_date_idx" ON "invoices"("organization_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_number_key" ON "invoices"("organization_id", "number");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_position_idx" ON "invoice_lines"("invoice_id", "position");

-- CreateIndex
CREATE INDEX "payments_organization_id_invoice_id_idx" ON "payments"("organization_id", "invoice_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_paid_at_idx" ON "payments"("organization_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_organization_id_idempotency_key_key" ON "payments"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

