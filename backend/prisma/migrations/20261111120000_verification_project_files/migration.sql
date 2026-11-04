-- AlterTable
ALTER TABLE "verification_documents" ADD COLUMN "project_id" UUID;

-- CreateIndex
CREATE INDEX "verification_documents_project_id_idx" ON "verification_documents"("project_id");

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "verification_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
