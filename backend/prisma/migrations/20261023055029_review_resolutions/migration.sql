-- CreateTable
CREATE TABLE "review_resolutions" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "initiated_by" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "outcome" VARCHAR(20),
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_messages" (
    "id" UUID NOT NULL,
    "resolution_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "sender_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_resolutions_token_hash_key" ON "review_resolutions"("token_hash");

-- CreateIndex
CREATE INDEX "review_resolutions_review_id_status_idx" ON "review_resolutions"("review_id", "status");

-- CreateIndex
CREATE INDEX "review_resolutions_organization_id_idx" ON "review_resolutions"("organization_id");

-- CreateIndex
CREATE INDEX "resolution_messages_resolution_id_created_at_idx" ON "resolution_messages"("resolution_id", "created_at");

-- AddForeignKey
ALTER TABLE "review_resolutions" ADD CONSTRAINT "review_resolutions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_resolutions" ADD CONSTRAINT "review_resolutions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_messages" ADD CONSTRAINT "resolution_messages_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "review_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_messages" ADD CONSTRAINT "resolution_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones del modelo completo (modelo_bd_fiverten_completo.sql)
ALTER TABLE "review_resolutions" ADD CONSTRAINT "review_resolutions_status_check" CHECK ("status" IN ('open','in_progress','accepted','rejected','closed'));
ALTER TABLE "review_resolutions" ADD CONSTRAINT "review_resolutions_outcome_check" CHECK ("outcome" IS NULL OR "outcome" IN ('resolved','unresolved','withdrawn'));
ALTER TABLE "resolution_messages" ADD CONSTRAINT "resolution_messages_sender_check" CHECK ("sender_type" IN ('company','client','system'));
