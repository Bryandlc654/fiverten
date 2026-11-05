-- Datos de cualificación de la empresa en la captación pública.
ALTER TABLE "verification_inquiries" ADD COLUMN "tax_id" VARCHAR(50);
ALTER TABLE "verification_inquiries" ADD COLUMN "sector" VARCHAR(120);
ALTER TABLE "verification_inquiries" ADD COLUMN "website" VARCHAR(255);
ALTER TABLE "verification_inquiries" ADD COLUMN "country" VARCHAR(120);
