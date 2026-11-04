-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_support_agent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "category" VARCHAR(40) NOT NULL DEFAULT 'general',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "sender_user_id" UUID,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_organization_id_status_last_message_at_idx" ON "support_tickets"("organization_id", "status", "last_message_at");
CREATE INDEX "support_tickets_assigned_to_status_idx" ON "support_tickets"("assigned_to", "status");
CREATE INDEX "support_tickets_status_priority_last_message_at_idx" ON "support_tickets"("status", "priority", "last_message_at");
CREATE INDEX "support_ticket_messages_ticket_id_created_at_idx" ON "support_ticket_messages"("ticket_id", "created_at");
CREATE INDEX "support_ticket_messages_organization_id_created_at_idx" ON "support_ticket_messages"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Estados, prioridades y categorías admitidas.
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_status_check"
    CHECK ("status" IN ('open', 'pending', 'resolved', 'closed'));
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_priority_check"
    CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_category_check"
    CHECK ("category" IN ('general', 'billing', 'reviews', 'technical', 'account', 'other'));
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_sender_check"
    CHECK ("sender_type" IN ('company', 'support', 'system'));
