DROP INDEX "idx_area_changes_area_id";--> statement-breakpoint
DROP INDEX "idx_area_changes_version";--> statement-breakpoint
DROP INDEX "idx_area_changes_sequence";--> statement-breakpoint
ALTER TABLE "area_changes" ADD CONSTRAINT "area_changes_area_id_version_area_id_version_number_sequence_number_pk" PRIMARY KEY("area_id","version_area_id","version_number","sequence_number");--> statement-breakpoint
ALTER TABLE "area_changes" ADD CONSTRAINT "fk_area_changes_area_id" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_changes" ADD CONSTRAINT "fk_area_changes_version" FOREIGN KEY ("version_area_id","version_number") REFERENCES "public"."area_versions"("area_id","version_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_changes" DROP COLUMN "id";