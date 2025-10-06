CREATE TABLE "api_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "area_layer_postal_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer_id" integer NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "area_layer_postal_codes_layer_id_postal_code_unique" UNIQUE("layer_id","postal_code")
);
--> statement-breakpoint
CREATE TABLE "area_layers" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(20) DEFAULT '#3b82f6' NOT NULL,
	"opacity" integer DEFAULT 70 NOT NULL,
	"is_visible" varchar(5) DEFAULT 'true' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"area_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"name" varchar(255),
	"description" text,
	"snapshot" jsonb NOT NULL,
	"changes_summary" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "area_versions_area_id_version_number_unique" UNIQUE("area_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"granularity" varchar(20) DEFAULT '5digit' NOT NULL,
	"is_archived" varchar(5) DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_code" varchar(50),
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"user_agent" text,
	"url" text,
	"user_id" varchar(100),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"component" varchar(100) NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" varchar(20) NOT NULL,
	"metadata" jsonb,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "postal_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"granularity" varchar(20) NOT NULL,
	"geometry" geometry(point) NOT NULL,
	"properties" jsonb,
	"bbox" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spatial_ref_sys" (
	"srid" integer NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4Text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"geometry" geometry(point) NOT NULL,
	"properties" jsonb,
	"bbox" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "states_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "idx_api_cache_expires" ON "api_cache" USING btree ("expires_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_api_cache_key" ON "api_cache" USING btree ("cache_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_area_layer_postal_codes_layer_id" ON "area_layer_postal_codes" USING btree ("layer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_layer_postal_codes_postal_code" ON "area_layer_postal_codes" USING btree ("postal_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_area_layers_area_id" ON "area_layers" USING btree ("area_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_layers_order" ON "area_layers" USING btree ("area_id" int4_ops,"order_index" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_versions_area_id" ON "area_versions" USING btree ("area_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_area_versions_created_at" ON "area_versions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_areas_name" ON "areas" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_areas_created_at" ON "areas" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_areas_is_archived" ON "areas" USING btree ("is_archived" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_code" ON "error_logs" USING btree ("error_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_timestamp" ON "error_logs" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_error_user" ON "error_logs" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_code" ON "postal_codes" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_geometry" ON "postal_codes" USING gist ("geometry" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_granularity" ON "postal_codes" USING btree ("granularity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_granularity_code" ON "postal_codes" USING btree ("granularity" text_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_states_code" ON "states" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_states_geometry" ON "states" USING gist ("geometry" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "idx_states_name" ON "states" USING btree ("name" text_ops);