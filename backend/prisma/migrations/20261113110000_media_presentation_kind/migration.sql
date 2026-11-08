-- La imagen de presentación del perfil usa el mismo almacén que logo/portada.
ALTER TABLE "media_files" DROP CONSTRAINT "media_files_kind_check";
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_kind_check"
    CHECK ("kind" IN ('logo', 'cover', 'avatar', 'presentation'));
