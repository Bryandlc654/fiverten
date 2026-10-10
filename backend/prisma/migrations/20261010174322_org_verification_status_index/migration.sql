-- CreateIndex
CREATE INDEX "organizations_verification_status_deleted_at_idx" ON "organizations"("verification_status", "deleted_at");
