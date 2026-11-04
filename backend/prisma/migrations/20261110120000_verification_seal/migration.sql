-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "decision_reason" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID,
    "category" VARCHAR(30) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "url" VARCHAR(500),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_requests_organization_id_status_created_at_idx" ON "verification_requests"("organization_id", "status", "created_at");
CREATE INDEX "verification_requests_status_created_at_idx" ON "verification_requests"("status", "created_at");
CREATE INDEX "verification_documents_organization_id_created_at_idx" ON "verification_documents"("organization_id", "created_at");
CREATE INDEX "verification_documents_request_id_idx" ON "verification_documents"("request_id");
CREATE INDEX "verification_projects_organization_id_created_at_idx" ON "verification_projects"("organization_id", "created_at");
CREATE INDEX "verification_projects_request_id_idx" ON "verification_projects"("request_id");

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Estados y categorías admitidas.
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_status_check"
    CHECK ("status" IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'revoked'));
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_category_check"
    CHECK ("category" IN ('identity', 'tax', 'address', 'project', 'other'));
