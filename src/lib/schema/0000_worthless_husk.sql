-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
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
CREATE TABLE "spatial_ref_sys" (
	"srid" integer NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
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
CREATE TABLE "postal_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"granularity" varchar(20) NOT NULL,
	"geometry" geometry(MultiPolygon,4326) NOT NULL,
	"properties" jsonb,
	"bbox" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"geometry" geometry(MultiPolygon,4326) NOT NULL,
	"properties" jsonb,
	"bbox" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "states_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "idx_perf_component" ON "performance_metrics" USING btree ("component" text_ops);--> statement-breakpoint
CREATE INDEX "idx_perf_timestamp" ON "performance_metrics" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_perf_type" ON "performance_metrics" USING btree ("metric_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_api_cache_expires" ON "api_cache" USING btree ("expires_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_api_cache_key" ON "api_cache" USING btree ("cache_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_code" ON "error_logs" USING btree ("error_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_timestamp" ON "error_logs" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_error_user" ON "error_logs" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_code" ON "postal_codes" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_geometry" ON "postal_codes" USING gist ("geometry" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_granularity" ON "postal_codes" USING btree ("granularity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_postal_codes_granularity_code" ON "postal_codes" USING btree ("granularity" text_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_states_code" ON "states" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_states_geometry" ON "states" USING gist ("geometry" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "idx_states_name" ON "states" USING btree ("name" text_ops);--> statement-breakpoint
CREATE VIEW "public"."geography_columns" AS (SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));--> statement-breakpoint
CREATE VIEW "public"."geometry_columns" AS (SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));
*/