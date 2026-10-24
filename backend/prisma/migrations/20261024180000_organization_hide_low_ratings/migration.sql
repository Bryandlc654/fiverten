-- La empresa decide si su perfil público muestra las reseñas de 1 y 2 estrellas.
ALTER TABLE "organizations" ADD COLUMN "hide_low_ratings" BOOLEAN NOT NULL DEFAULT false;
