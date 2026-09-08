-- Lot 2 : enrichissement Client (notes, dernier contact, archivage séparé du
-- statut CRM) + nouveau modèle Task. Voir docs/v1/lot-2-clients-dashboard.md.

-- --- Organization : seuil de relance configurable ---------------------------
ALTER TABLE "organizations" ADD COLUMN "client_follow_up_days" INTEGER NOT NULL DEFAULT 30;

-- --- Client : nouveaux champs ------------------------------------------------
ALTER TABLE "clients" ADD COLUMN "notes" TEXT;
ALTER TABLE "clients" ADD COLUMN "last_contact_at" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "archived_at" TIMESTAMP(3);

-- L'ancien statut 'archived' devient : archived_at renseigné + statut CRM
-- réel. Aucune donnée de production sur cet environnement de développement
-- (seed uniquement) : mapping best-effort vers 'inactive' pour tout statut
-- 'archived' préexistant, avant de changer le type de la colonne.
UPDATE "clients" SET "archived_at" = "updated_at" WHERE "status" = 'archived';

ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
UPDATE "clients" SET "status" = 'inactive' WHERE "status" = 'archived';

DROP TYPE "ClientStatus";
CREATE TYPE "ClientStatus" AS ENUM ('prospect', 'active', 'to_follow_up', 'inactive', 'loyal');

ALTER TABLE "clients" ALTER COLUMN "status" TYPE "ClientStatus" USING ("status"::"ClientStatus");
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'prospect';

CREATE INDEX "clients_organization_id_status_idx" ON "clients"("organization_id", "status");
CREATE INDEX "clients_organization_id_last_contact_at_idx" ON "clients"("organization_id", "last_contact_at");

-- --- Task ---------------------------------------------------------------
CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high');

CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "title" TEXT NOT NULL,
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_organization_id_due_date_idx" ON "tasks"("organization_id", "due_date");
CREATE INDEX "tasks_organization_id_completed_at_idx" ON "tasks"("organization_id", "completed_at");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
