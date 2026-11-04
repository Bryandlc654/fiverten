-- CreateTable
CREATE TABLE "review_campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_campaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "review_requests" ADD COLUMN "campaign_id" UUID;

-- CreateIndex
CREATE INDEX "review_campaigns_organization_id_status_created_at_idx" ON "review_campaigns"("organization_id", "status", "created_at");
CREATE INDEX "review_requests_campaign_id_idx" ON "review_requests"("campaign_id");

-- AddForeignKey
ALTER TABLE "review_campaigns" ADD CONSTRAINT "review_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "review_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Estados admitidos.
ALTER TABLE "review_campaigns" ADD CONSTRAINT "review_campaigns_status_check"
    CHECK ("status" IN ('draft', 'active', 'completed'));
