-- DropIndex
DROP INDEX "review_resolutions_organization_id_idx";

-- DropIndex
DROP INDEX "review_cases_organization_id_idx";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "notify_negative_reviews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_new_reviews" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "link" VARCHAR(500),
    "review_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_created_at_idx" ON "notifications"("organization_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_read_at_idx" ON "notifications"("organization_id", "user_id", "read_at");

-- CreateIndex
CREATE INDEX "reviews_organization_id_created_at_idx" ON "reviews"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_organization_id_published_at_idx" ON "reviews"("organization_id", "published_at");

-- CreateIndex
CREATE INDEX "review_resolutions_organization_id_status_idx" ON "review_resolutions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "review_cases_organization_id_status_idx" ON "review_cases"("organization_id", "status");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Tipos de aviso admitidos (añadir aquí los nuevos).
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check"
    CHECK ("type" IN ('new_review', 'negative_review'));
