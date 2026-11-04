-- CreateTable
CREATE TABLE "media_files" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "kind" VARCHAR(20) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_files_organization_id_idx" ON "media_files"("organization_id");
CREATE INDEX "media_files_user_id_idx" ON "media_files"("user_id");

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tipos admitidos.
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_kind_check"
    CHECK ("kind" IN ('logo', 'cover', 'avatar'));
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_size_check"
    CHECK ("size" > 0);
