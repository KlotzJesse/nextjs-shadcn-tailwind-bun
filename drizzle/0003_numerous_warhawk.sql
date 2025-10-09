ALTER TABLE "area_versions" DROP CONSTRAINT "area_versions_area_id_version_number_unique";--> statement-breakpoint
DROP INDEX "idx_areas_current_version";--> statement-breakpoint
ALTER TABLE "area_versions" ADD CONSTRAINT "area_versions_area_id_version_number_pk" PRIMARY KEY("area_id","version_number");--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "current_version_number" integer;--> statement-breakpoint
CREATE INDEX "idx_areas_current_version" ON "areas" USING btree ("current_version_number" int4_ops);--> statement-breakpoint
ALTER TABLE "area_versions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "areas" DROP COLUMN "current_version_id";