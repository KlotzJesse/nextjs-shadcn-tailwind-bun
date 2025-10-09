ALTER TABLE "area_versions" RENAME COLUMN "parent_version_id" TO "parent_version_area_id";--> statement-breakpoint
DROP INDEX "idx_area_versions_parent";--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "parent_version_number" integer;--> statement-breakpoint
CREATE INDEX "idx_area_versions_parent" ON "area_versions" USING btree ("parent_version_area_id" int4_ops,"parent_version_number" int4_ops);