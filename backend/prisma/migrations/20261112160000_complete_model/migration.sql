-- Ubicaciones de la organización.
CREATE TABLE "organization_locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "address_line" VARCHAR(255),
    "city" VARCHAR(120),
    "region" VARCHAR(120),
    "postal_code" VARCHAR(30),
    "country" VARCHAR(120),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "organization_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_locations_organization_id_is_primary_idx"
    ON "organization_locations"("organization_id", "is_primary");

ALTER TABLE "organization_locations"
    ADD CONSTRAINT "organization_locations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Relación proyecto-cliente.
CREATE TABLE "client_relations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "client_user_id" UUID,
    "contact_name" VARCHAR(200) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'invited',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMPTZ(6),
    "verification_level" VARCHAR(20) NOT NULL DEFAULT 'identified',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "client_relations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_relations_project_id_contact_email_key"
    ON "client_relations"("project_id", "contact_email");
CREATE INDEX "client_relations_organization_id_status_idx"
    ON "client_relations"("organization_id", "status");
CREATE INDEX "client_relations_contact_email_idx"
    ON "client_relations"("contact_email");

ALTER TABLE "client_relations"
    ADD CONSTRAINT "client_relations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_relations"
    ADD CONSTRAINT "client_relations_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "verification_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_relations"
    ADD CONSTRAINT "client_relations_client_user_id_fkey"
    FOREIGN KEY ("client_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_status_check"
    CHECK ("status" IN ('invited', 'active', 'completed', 'revoked'));
ALTER TABLE "client_relations" ADD CONSTRAINT "client_relations_verification_level_check"
    CHECK ("verification_level" IN ('identified', 'confirmed', 'verified'));

-- Evidencia auditable.
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID,
    "project_id" UUID,
    "owner_type" VARCHAR(30) NOT NULL DEFAULT 'organization',
    "owner_id" UUID,
    "type" VARCHAR(40) NOT NULL,
    "file_ref" VARCHAR(500) NOT NULL,
    "source_ref" VARCHAR(500),
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
    "issue_date" DATE,
    "expiry_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "hash" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evidence_organization_id_status_idx"
    ON "evidence"("organization_id", "status");
CREATE INDEX "evidence_organization_id_visibility_idx"
    ON "evidence"("organization_id", "visibility");
CREATE INDEX "evidence_request_id_idx" ON "evidence"("request_id");
CREATE INDEX "evidence_project_id_idx" ON "evidence"("project_id");

ALTER TABLE "evidence"
    ADD CONSTRAINT "evidence_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence"
    ADD CONSTRAINT "evidence_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence"
    ADD CONSTRAINT "evidence_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "verification_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evidence" ADD CONSTRAINT "evidence_visibility_check"
    CHECK ("visibility" IN ('private', 'public', 'restricted'));
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_status_check"
    CHECK ("status" IN ('submitted', 'verified', 'rejected', 'expired'));

-- Sello público con token de embed independiente.
CREATE TABLE "public_badges" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'active',
    "embed_token" VARCHAR(80) NOT NULL,
    "current_url" VARCHAR(500) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "public_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_badges_organization_id_key"
    ON "public_badges"("organization_id");
CREATE UNIQUE INDEX "public_badges_embed_token_key"
    ON "public_badges"("embed_token");
CREATE INDEX "public_badges_state_idx" ON "public_badges"("state");

ALTER TABLE "public_badges"
    ADD CONSTRAINT "public_badges_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public_badges" ADD CONSTRAINT "public_badges_state_check"
    CHECK ("state" IN ('active', 'revoked', 'expired'));

-- Campos de verificación de organización.
ALTER TABLE "verification_requests" ADD COLUMN "scope" VARCHAR(200);
ALTER TABLE "verification_requests" ADD COLUMN "methodology_version" VARCHAR(50);

UPDATE "verification_requests"
SET "scope" = 'identity,documentation,projects',
    "methodology_version" = 'v1.0'
WHERE "status" = 'approved';

-- Campos de verificación de proyecto.
ALTER TABLE "verification_projects" ADD COLUMN "location" VARCHAR(255);
ALTER TABLE "verification_projects" ADD COLUMN "start_date" DATE;
ALTER TABLE "verification_projects" ADD COLUMN "end_date" DATE;
ALTER TABLE "verification_projects" ADD COLUMN "public_visibility" VARCHAR(20) NOT NULL DEFAULT 'public';
ALTER TABLE "verification_projects" ADD COLUMN "evidence_types" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "verification_projects" ADD COLUMN "verification_reviewer_id" UUID;

UPDATE "verification_projects" p
SET "verification_reviewer_id" = r."reviewed_by"
FROM "verification_requests" r
WHERE p."request_id" = r."id" AND r."reviewed_by" IS NOT NULL;

UPDATE "verification_projects" p
SET "evidence_types" = COALESCE(
    (
        SELECT array_agg(DISTINCT d."evidence_type")
        FROM "verification_documents" d
        WHERE d."project_id" = p."id" AND d."evidence_type" IS NOT NULL
    ),
    '{}'
);

ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_public_visibility_check"
    CHECK ("public_visibility" IN ('private', 'public', 'restricted'));

CREATE INDEX "verification_projects_organization_id_public_visibility_idx"
    ON "verification_projects"("organization_id", "public_visibility");

-- Documento formal: versión, emisor, número y vigencia.
ALTER TABLE "verification_documents" ADD COLUMN "evidence_id" UUID;
ALTER TABLE "verification_documents" ADD COLUMN "issuer" VARCHAR(200);
ALTER TABLE "verification_documents" ADD COLUMN "document_number" VARCHAR(120);
ALTER TABLE "verification_documents" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "verification_documents" ADD COLUMN "issue_date" DATE;
ALTER TABLE "verification_documents" ADD COLUMN "expiry_date" DATE;

WITH ranked AS (
    SELECT "id",
           row_number() OVER (
               PARTITION BY "organization_id", "category"
               ORDER BY "created_at", "id"
           )::int AS rn
    FROM "verification_documents"
)
UPDATE "verification_documents" d
SET "version" = ranked.rn
FROM ranked
WHERE d."id" = ranked."id";

WITH created AS (
    INSERT INTO "evidence" (
        "id", "organization_id", "request_id", "project_id", "owner_type", "owner_id",
        "type", "file_ref", "source_ref", "visibility", "issue_date", "expiry_date",
        "status", "hash", "metadata", "created_by", "created_at", "updated_at"
    )
    SELECT gen_random_uuid(),
           d."organization_id",
           d."request_id",
           d."project_id",
           CASE WHEN d."project_id" IS NULL THEN 'organization' ELSE 'project' END,
           COALESCE(d."project_id", d."organization_id"),
           COALESCE(d."evidence_type", d."category"),
           'db://verification-documents/' || d."id",
           d."filename",
           'private',
           d."created_at"::date,
           NULL,
           CASE
               WHEN r."status" = 'approved' THEN 'verified'
               WHEN r."status" IN ('rejected', 'revoked') THEN 'rejected'
               ELSE 'submitted'
           END,
           NULL,
           '{}',
           d."created_by",
           d."created_at",
           CURRENT_TIMESTAMP
    FROM "verification_documents" d
    LEFT JOIN "verification_requests" r ON r."id" = d."request_id"
    RETURNING "id", "file_ref"
)
UPDATE "verification_documents" d
SET "evidence_id" = created."id"
FROM created
WHERE created."file_ref" = 'db://verification-documents/' || d."id";

ALTER TABLE "verification_documents" ALTER COLUMN "evidence_id" SET NOT NULL;
CREATE UNIQUE INDEX "verification_documents_evidence_id_key"
    ON "verification_documents"("evidence_id");
CREATE INDEX "verification_documents_organization_id_category_version_idx"
    ON "verification_documents"("organization_id", "category", "version");
ALTER TABLE "verification_documents"
    ADD CONSTRAINT "verification_documents_evidence_id_fkey"
    FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Relaciones con clientes en solicitudes y reseñas.
ALTER TABLE "review_requests" ADD COLUMN "client_relation_id" UUID;
ALTER TABLE "reviews" ADD COLUMN "client_relation_id" UUID;
CREATE INDEX "review_requests_client_relation_id_idx"
    ON "review_requests"("client_relation_id");
CREATE INDEX "reviews_client_relation_id_idx" ON "reviews"("client_relation_id");
ALTER TABLE "review_requests"
    ADD CONSTRAINT "review_requests_client_relation_id_fkey"
    FOREIGN KEY ("client_relation_id") REFERENCES "client_relations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_client_relation_id_fkey"
    FOREIGN KEY ("client_relation_id") REFERENCES "client_relations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Eventos genéricos por entidad.
ALTER TABLE "verification_events"
    ADD COLUMN "entity_type" VARCHAR(40) NOT NULL DEFAULT 'organization_verification';
ALTER TABLE "verification_events" ADD COLUMN "entity_id" UUID;

UPDATE "verification_events"
SET "entity_id" = COALESCE("request_id", "organization_id");

CREATE INDEX "verification_events_entity_type_entity_id_created_at_idx"
    ON "verification_events"("entity_type", "entity_id", "created_at");

-- Badge para organizaciones ya verificadas.
INSERT INTO "public_badges" (
    "id", "organization_id", "state", "embed_token", "current_url",
    "created_at", "updated_at"
)
SELECT gen_random_uuid(),
       o."id",
       'active',
       md5(random()::text || o."id"::text || clock_timestamp()::text),
       '/empresa/' || o."slug",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "organizations" o
WHERE o."verification_status" = 'verified' AND o."deleted_at" IS NULL;

-- Trigger lógico de updated_at para tablas nuevas.
ALTER TABLE "organization_locations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "client_relations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "evidence" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public_badges" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
