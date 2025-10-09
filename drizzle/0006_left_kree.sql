ALTER TABLE "area_versions" DROP CONSTRAINT "area_versions_area_id_version_number_unique";--> statement-breakpoint
DROP INDEX "idx_area_changes_version_id";--> statement-breakpoint
ALTER TABLE "area_versions" ADD CONSTRAINT "area_versions_area_id_version_number_pk" PRIMARY KEY("area_id","version_number");--> statement-breakpoint
ALTER TABLE "area_changes" ADD COLUMN "version_area_id" integer;--> statement-breakpoint
ALTER TABLE "area_changes" ADD COLUMN "version_number" integer;--> statement-breakpoint
CREATE INDEX "idx_area_changes_version" ON "area_changes" USING btree ("version_area_id" int4_ops,"version_number" int4_ops);--> statement-breakpoint
ALTER TABLE "area_changes" DROP COLUMN "version_id";--> statement-breakpoint
ALTER TABLE "area_versions" DROP COLUMN "id";