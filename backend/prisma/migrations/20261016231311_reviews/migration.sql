-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "reviewer_name" VARCHAR(200) NOT NULL,
    "reviewer_email" VARCHAR(255) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" VARCHAR(255),
    "body" TEXT NOT NULL,
    "experience_date" DATE,
    "order_reference" VARCHAR(100),
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "lifecycle_status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "verification_status" VARCHAR(20) NOT NULL DEFAULT 'not_verified',
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
    "moderation_status" VARCHAR(20) NOT NULL DEFAULT 'none',
    "confirm_token_hash" VARCHAR(255),
    "email_confirmed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_responses" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_confirm_token_hash_key" ON "reviews"("confirm_token_hash");

-- CreateIndex
CREATE INDEX "reviews_organization_id_deleted_at_idx" ON "reviews"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "reviews_organization_id_lifecycle_status_moderation_status_idx" ON "reviews"("organization_id", "lifecycle_status", "moderation_status");

-- CreateIndex
CREATE INDEX "reviews_organization_id_rating_idx" ON "reviews"("organization_id", "rating");

-- CreateIndex
CREATE INDEX "reviews_published_at_idx" ON "reviews"("published_at");

-- CreateIndex
CREATE INDEX "reviews_ip_address_idx" ON "reviews"("ip_address");

-- CreateIndex
CREATE INDEX "reviews_organization_id_reviewer_email_idx" ON "reviews"("organization_id", "reviewer_email");

-- CreateIndex
CREATE UNIQUE INDEX "review_responses_review_id_key" ON "review_responses"("review_id");

-- CreateIndex
CREATE INDEX "review_responses_organization_id_idx" ON "review_responses"("organization_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "organization_invitations_organization_id_accepted_at_revoked_at" RENAME TO "organization_invitations_organization_id_accepted_at_revoke_idx";

-- Restricciones del modelo completo (modelo_bd_fiverten_completo.sql)
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lifecycle_check" CHECK ("lifecycle_status" IN ('draft','submitted','published','archived'));
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_verif_check" CHECK ("verification_status" IN ('not_verified','pending','verified','expired','rejected'));
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visibility_check" CHECK ("visibility" IN ('private','restricted','public'));
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderation_check" CHECK ("moderation_status" IN ('none','reported','under_review','resolved','rejected','hidden'));
-- Una reseña oculta por moderación no puede seguir siendo pública.
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hidden_visibility_check" CHECK (NOT ("moderation_status" = 'hidden' AND "visibility" = 'public'));
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_published_at_check" CHECK ("lifecycle_status" <> 'published' OR "published_at" IS NOT NULL);
