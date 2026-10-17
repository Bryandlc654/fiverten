-- CreateTable
CREATE TABLE "report_reasons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reports" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "reason_id" UUID,
    "reporter_user_id" UUID,
    "reporter_organization_id" UUID,
    "comment" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "ip_address" VARCHAR(45),
    "handled_by" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "moderator_id" UUID,
    "action" VARCHAR(30) NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_reasons_code_key" ON "report_reasons"("code");

-- CreateIndex
CREATE INDEX "review_reports_review_id_idx" ON "review_reports"("review_id");

-- CreateIndex
CREATE INDEX "review_reports_status_created_at_idx" ON "review_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_review_id_created_at_idx" ON "moderation_actions"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_moderator_id_idx" ON "moderation_actions"("moderator_id");

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "report_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones del modelo completo (modelo_bd_fiverten_completo.sql)
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_status_check" CHECK ("status" IN ('open','reviewing','accepted','rejected','closed'));
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_action_check" CHECK ("action" IN ('hide','publish','restore','reject','flag','unflag','delete'));

-- Motivos de reporte (alcance, punto 17)
INSERT INTO "report_reasons" ("id", "code", "label", "sort_order") VALUES
  (gen_random_uuid(), 'spam', 'Spam', 10),
  (gen_random_uuid(), 'offensive', 'Contenido ofensivo', 20),
  (gen_random_uuid(), 'personal_info', 'Información personal', 30),
  (gen_random_uuid(), 'conflict_of_interest', 'Conflicto de intereses', 40),
  (gen_random_uuid(), 'not_real_experience', 'No corresponde a una experiencia real', 50),
  (gen_random_uuid(), 'advertising', 'Publicidad', 60),
  (gen_random_uuid(), 'illegal', 'Contenido ilegal', 70),
  (gen_random_uuid(), 'other', 'Otro', 80);
