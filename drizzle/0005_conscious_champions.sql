ALTER TABLE "area_versions" DROP CONSTRAINT "area_versions_area_id_version_number_pk";--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "area_versions" ADD CONSTRAINT "area_versions_area_id_version_number_unique" UNIQUE("area_id","version_number");