-- CreateTable
CREATE TABLE "review_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "reviewer_name" VARCHAR(200) NOT NULL,
    "reviewer_email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "review_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_token_hash_key" ON "review_requests"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_review_id_key" ON "review_requests"("review_id");

-- CreateIndex
CREATE INDEX "review_requests_organization_id_status_created_at_idx" ON "review_requests"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "review_requests_organization_id_reviewer_email_idx" ON "review_requests"("organization_id", "reviewer_email");

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Estados admitidos para una solicitud.
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_status_check"
    CHECK ("status" IN ('sent', 'opened', 'completed'));
