-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "project_id" UUID;

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200) NOT NULL,
    "credential_id" VARCHAR(200),
    "credential_url" VARCHAR(500),
    "issued_at" DATE,
    "expires_at" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "decision_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_inquiries" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "handled_by" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certifications_organization_id_status_idx" ON "certifications"("organization_id", "status");

-- CreateIndex
CREATE INDEX "certifications_status_created_at_idx" ON "certifications"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_inquiries_status_created_at_idx" ON "verification_inquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_inquiries_email_idx" ON "verification_inquiries"("email");

-- CreateIndex
CREATE INDEX "reviews_project_id_idx" ON "reviews"("project_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "verification_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
