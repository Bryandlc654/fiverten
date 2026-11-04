-- CreateTable
CREATE TABLE "review_cases" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'awaiting_admin',
    "outcome" VARCHAR(20),
    "client_token_hash" VARCHAR(255),
    "client_token_expires_at" TIMESTAMPTZ(6),
    "company_notified_at" TIMESTAMPTZ(6),
    "client_agreed_at" TIMESTAMPTZ(6),
    "company_agreed_at" TIMESTAMPTZ(6),
    "decision_reason" TEXT,
    "decided_by" UUID,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_case_messages" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "sender_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_case_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_case_files" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_case_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_cases_review_id_key" ON "review_cases"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_cases_client_token_hash_key" ON "review_cases"("client_token_hash");

-- CreateIndex
CREATE INDEX "review_cases_status_idx" ON "review_cases"("status");

-- CreateIndex
CREATE INDEX "review_cases_organization_id_idx" ON "review_cases"("organization_id");

-- CreateIndex
CREATE INDEX "review_case_messages_case_id_created_at_idx" ON "review_case_messages"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "review_case_files_case_id_idx" ON "review_case_files"("case_id");

-- CreateIndex
CREATE INDEX "review_case_files_message_id_idx" ON "review_case_files"("message_id");

-- AddForeignKey
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_case_messages" ADD CONSTRAINT "review_case_messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "review_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_case_messages" ADD CONSTRAINT "review_case_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_case_files" ADD CONSTRAINT "review_case_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "review_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_case_files" ADD CONSTRAINT "review_case_files_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "review_case_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_case_files" ADD CONSTRAINT "review_case_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Valores permitidos (mismo criterio que review_resolutions).
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_status_check"
    CHECK ("status" IN ('awaiting_admin', 'evidence_requested', 'evidence_submitted', 'company_notified', 'company_responded', 'closed'));
ALTER TABLE "review_cases" ADD CONSTRAINT "review_cases_outcome_check"
    CHECK ("outcome" IS NULL OR "outcome" IN ('rejected', 'published', 'withdrawn'));
ALTER TABLE "review_case_messages" ADD CONSTRAINT "review_case_messages_sender_check"
    CHECK ("sender_type" IN ('admin', 'client', 'company', 'system'));
