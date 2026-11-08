-- Marca para no repetir el recordatorio de renovación de una misma caducidad.
ALTER TABLE "organizations" ADD COLUMN "verification_reminder_for" TIMESTAMPTZ(6);
