-- AlterTable
ALTER TABLE "certifications" ADD COLUMN     "data_origin" VARCHAR(30) NOT NULL DEFAULT 'source_derived';

-- AlterTable
ALTER TABLE "organization_invitations" ADD COLUMN     "is_owner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_verifier" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "verification_documents" ADD COLUMN     "data_origin" VARCHAR(30) NOT NULL DEFAULT 'company_submitted';

-- AlterTable
ALTER TABLE "verification_projects" ADD COLUMN     "data_origin" VARCHAR(30) NOT NULL DEFAULT 'company_submitted';

-- CreateTable
CREATE TABLE "verification_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "request_id" UUID,
    "actor_id" UUID,
    "actor_type" VARCHAR(30) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "previous_status" VARCHAR(20),
    "new_status" VARCHAR(20),
    "reason" TEXT,
    "source" VARCHAR(200),
    "evidence" TEXT,
    "data_origin" VARCHAR(30) NOT NULL DEFAULT 'fiverten_verified',
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_events_organization_id_created_at_idx" ON "verification_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_events_request_id_created_at_idx" ON "verification_events"("request_id", "created_at");

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Roles del proyecto: solo Admin, Editor y Viewer. La propiedad es la marca
-- organization_memberships.is_owner, no un rol independiente.
INSERT INTO "roles" (
  "id", "organization_id", "name", "slug", "base_role", "description",
  "scope", "is_active", "is_system", "priority", "created_at", "updated_at"
)
SELECT gen_random_uuid(), o."id", 'Admin', 'admin', 'admin',
       'Rol de sistema: Admin', 'organization', true, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" r
  WHERE r."organization_id" = o."id" AND r."base_role" = 'admin' AND r."deleted_at" IS NULL
);

INSERT INTO "roles" (
  "id", "organization_id", "name", "slug", "base_role", "description",
  "scope", "is_active", "is_system", "priority", "created_at", "updated_at"
)
SELECT gen_random_uuid(), o."id", 'Editor', 'editor', 'editor',
       'Rol de sistema: Editor', 'organization', true, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" r
  WHERE r."organization_id" = o."id" AND r."base_role" = 'editor' AND r."deleted_at" IS NULL
);

INSERT INTO "roles" (
  "id", "organization_id", "name", "slug", "base_role", "description",
  "scope", "is_active", "is_system", "priority", "created_at", "updated_at"
)
SELECT gen_random_uuid(), o."id", 'Viewer', 'viewer', 'viewer',
       'Rol de sistema: Viewer', 'organization', true, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" r
  WHERE r."organization_id" = o."id" AND r."base_role" = 'viewer' AND r."deleted_at" IS NULL
);

UPDATE "organization_memberships" m
SET "role_id" = admin_role."id"
FROM "roles" old_role, "roles" admin_role
WHERE m."role_id" = old_role."id"
  AND old_role."base_role" = 'owner'
  AND admin_role."organization_id" = m."organization_id"
  AND admin_role."base_role" = 'admin'
  AND admin_role."deleted_at" IS NULL;

UPDATE "organization_memberships" m
SET "role_id" = editor_role."id"
FROM "roles" old_role, "roles" editor_role
WHERE m."role_id" = old_role."id"
  AND old_role."base_role" = 'manager'
  AND editor_role."organization_id" = m."organization_id"
  AND editor_role."base_role" = 'editor'
  AND editor_role."deleted_at" IS NULL;

UPDATE "organization_invitations"
SET "role" = 'admin', "is_owner" = true
WHERE "role" = 'owner';

UPDATE "organization_invitations"
SET "role" = 'editor'
WHERE "role" = 'manager';

DELETE FROM "roles" WHERE "base_role" IN ('owner', 'manager');

ALTER TABLE "roles" ADD CONSTRAINT "roles_base_role_check"
  CHECK ("base_role" IS NULL OR "base_role" IN ('admin', 'editor', 'viewer'));

ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_role_check"
  CHECK ("role" IN ('admin', 'editor', 'viewer'));

ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_data_origin_check"
  CHECK ("data_origin" IN ('company_submitted', 'fiverten_verified', 'source_derived', 'system_calculated'));

ALTER TABLE "verification_projects" ADD CONSTRAINT "verification_projects_data_origin_check"
  CHECK ("data_origin" IN ('company_submitted', 'fiverten_verified', 'source_derived', 'system_calculated'));

ALTER TABLE "certifications" ADD CONSTRAINT "certifications_data_origin_check"
  CHECK ("data_origin" IN ('company_submitted', 'fiverten_verified', 'source_derived', 'system_calculated'));

ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_data_origin_check"
  CHECK ("data_origin" IN ('company_submitted', 'fiverten_verified', 'source_derived', 'system_calculated'));
