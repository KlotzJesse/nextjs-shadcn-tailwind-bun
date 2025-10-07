CREATE TABLE "area_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_id" integer NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"change_data" jsonb NOT NULL,
	"previous_data" jsonb,
	"version_id" integer,
	"sequence_number" integer NOT NULL,
	"is_undone" varchar(5) DEFAULT 'false' NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_undo_stacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_id" integer NOT NULL,
	"undo_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"redo_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "area_undo_stacks_area_id_unique" UNIQUE("area_id")
);
--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "parent_version_id" integer;--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "is_active" varchar(5) DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE "area_versions" ADD COLUMN "change_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "current_version_id" integer;--> statement-breakpoint
CREATE INDEX "idx_area_changes_area_id" ON "area_changes" USING btree ("area_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_changes_version_id" ON "area_changes" USING btree ("version_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_changes_sequence" ON "area_changes" USING btree ("area_id" int4_ops,"sequence_number" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_changes_created_at" ON "area_changes" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_area_changes_entity" ON "area_changes" USING btree ("entity_type" text_ops,"entity_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_undo_stacks_area_id" ON "area_undo_stacks" USING btree ("area_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_versions_parent" ON "area_versions" USING btree ("parent_version_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_versions_is_active" ON "area_versions" USING btree ("area_id" int4_ops,"is_active" text_ops);--> statement-breakpoint
CREATE INDEX "idx_areas_current_version" ON "areas" USING btree ("current_version_id" int4_ops);