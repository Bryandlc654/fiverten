-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "verification_methodology" VARCHAR(200),
ADD COLUMN     "verified_at" TIMESTAMPTZ(6),
ALTER COLUMN "verification_status" SET DEFAULT 'identified';

-- AlterTable
ALTER TABLE "verification_documents" ADD COLUMN     "evidence_type" VARCHAR(30);

-- AlterTable
ALTER TABLE "verification_projects" ADD COLUMN     "city" VARCHAR(120),
ADD COLUMN     "client_status" VARCHAR(20) NOT NULL DEFAULT 'identified',
ADD COLUMN     "methodology" VARCHAR(200),
ADD COLUMN     "project_type" VARCHAR(50),
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
ADD COLUMN     "verification_scope" VARCHAR(200),
ADD COLUMN     "verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "year" INTEGER;

-- CreateTable
CREATE TABLE "review_revisions" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" UUID,
    "previous_rating" SMALLINT,
    "new_rating" SMALLINT,
    "previous_title" VARCHAR(255),
    "new_title" VARCHAR(255),
    "previous_body" TEXT,
    "new_body" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_revisions_review_id_created_at_idx" ON "review_revisions"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "review_revisions_organization_id_created_at_idx" ON "review_revisions"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "review_revisions" ADD CONSTRAINT "review_revisions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_revisions" ADD CONSTRAINT "review_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrar el estado legado a IDENTIFIED (canal/correo confirmado).
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_verif_check";
UPDATE "reviews" SET "verification_status" = 'identified' WHERE "verification_status" NOT IN ('identified', 'confirmed', 'verified');

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_verification_status_check"
  CHECK ("verification_status" IN ('identified', 'confirmed', 'verified'));

ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_status_check"
  CHECK ("status" IN ('ongoing', 'completed'));

ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_client_status_check"
  CHECK ("client_status" IN ('identified', 'confirmed', 'verified'));

ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_evidence_type_check"
  CHECK ("evidence_type" IS NULL OR "evidence_type" IN ('contract', 'budget', 'invoice', 'photos', 'certificate', 'act', 'other'));
