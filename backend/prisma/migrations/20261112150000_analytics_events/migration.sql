-- Eventos agregados del perfil público: visitas, clics y descargas del sello.
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "source" VARCHAR(40) NOT NULL DEFAULT 'direct',
    "path" VARCHAR(300),
    "referrer" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_events_organization_id_created_at_idx"
    ON "analytics_events"("organization_id", "created_at");

CREATE INDEX "analytics_events_organization_id_type_created_at_idx"
    ON "analytics_events"("organization_id", "type", "created_at");

CREATE INDEX "analytics_events_organization_id_source_created_at_idx"
    ON "analytics_events"("organization_id", "source", "created_at");

ALTER TABLE "analytics_events"
    ADD CONSTRAINT "analytics_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
