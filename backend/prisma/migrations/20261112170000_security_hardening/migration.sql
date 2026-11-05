-- Privacidad granular de ubicaciones y credenciales.
ALTER TABLE "organization_locations"
    ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "certifications"
    ADD COLUMN "public_credential" BOOLEAN NOT NULL DEFAULT false;

-- Cifrado y estado de escaneo de archivos.
ALTER TABLE "verification_documents"
    ADD COLUMN "encryption_version" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "scan_status" VARCHAR(20) NOT NULL DEFAULT 'not_scanned';
ALTER TABLE "media_files"
    ADD COLUMN "encryption_version" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "scan_status" VARCHAR(20) NOT NULL DEFAULT 'not_scanned';
ALTER TABLE "review_case_files"
    ADD COLUMN "encryption_version" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "scan_status" VARCHAR(20) NOT NULL DEFAULT 'not_scanned';

ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_scan_status_check"
    CHECK ("scan_status" IN ('not_scanned', 'clean', 'infected', 'error'));
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_scan_status_check"
    CHECK ("scan_status" IN ('not_scanned', 'clean', 'infected', 'error'));
ALTER TABLE "review_case_files" ADD CONSTRAINT "review_case_files_scan_status_check"
    CHECK ("scan_status" IN ('not_scanned', 'clean', 'infected', 'error'));

-- Consentimiento versionado.
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "subject_type" VARCHAR(30) NOT NULL,
    "subject_id" UUID,
    "email" VARCHAR(255),
    "type" VARCHAR(40) NOT NULL,
    "version" VARCHAR(30) NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "text_hash" VARCHAR(64),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consent_records_organization_id_type_created_at_idx"
    ON "consent_records"("organization_id", "type", "created_at");
CREATE INDEX "consent_records_email_type_idx" ON "consent_records"("email", "type");
CREATE INDEX "consent_records_subject_type_subject_id_idx"
    ON "consent_records"("subject_type", "subject_id");
ALTER TABLE "consent_records"
    ADD CONSTRAINT "consent_records_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_records"
    ADD CONSTRAINT "consent_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Solicitudes de derechos GDPR.
CREATE TABLE "privacy_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "details" TEXT,
    "response" TEXT,
    "handled_by" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "privacy_requests_user_id_created_at_idx"
    ON "privacy_requests"("user_id", "created_at");
CREATE INDEX "privacy_requests_status_created_at_idx"
    ON "privacy_requests"("status", "created_at");
ALTER TABLE "privacy_requests"
    ADD CONSTRAINT "privacy_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_requests"
    ADD CONSTRAINT "privacy_requests_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_type_check"
    CHECK ("type" IN ('access', 'rectification', 'erasure', 'objection'));
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_status_check"
    CHECK ("status" IN ('pending', 'in_progress', 'completed', 'rejected'));

-- Auditoría append-only: no se permite modificar ni borrar eventos desde SQL.
CREATE OR REPLACE FUNCTION fiverten_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'append_only_table: %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verification_events_append_only ON "verification_events";
CREATE TRIGGER verification_events_append_only
    BEFORE UPDATE OR DELETE ON "verification_events"
    FOR EACH ROW EXECUTE FUNCTION fiverten_append_only();

DROP TRIGGER IF EXISTS moderation_actions_append_only ON "moderation_actions";
CREATE TRIGGER moderation_actions_append_only
    BEFORE UPDATE OR DELETE ON "moderation_actions"
    FOR EACH ROW EXECUTE FUNCTION fiverten_append_only();
