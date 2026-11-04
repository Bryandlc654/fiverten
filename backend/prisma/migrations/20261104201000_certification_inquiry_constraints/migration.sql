-- Estados admitidos para certificaciones externas.
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_status_check"
    CHECK ("status" IN ('pending', 'verified', 'rejected'));

-- Estados admitidos para solicitudes de captación.
ALTER TABLE "verification_inquiries" ADD CONSTRAINT "verification_inquiries_status_check"
    CHECK ("status" IN ('new', 'contacted', 'closed'));

-- Una certificación no puede caducar antes de emitirse.
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_dates_check"
    CHECK ("issued_at" IS NULL OR "expires_at" IS NULL OR "expires_at" >= "issued_at");
