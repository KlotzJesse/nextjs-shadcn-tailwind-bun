import { sql } from "drizzle-orm";
import { check, geometry, index, integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";



export const performanceMetrics = pgTable("performance_metrics", {
	id: serial().primaryKey().notNull(),
	component: varchar({ length: 100 }).notNull(),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	value: varchar({ length: 20 }).notNull(),
	metadata: jsonb(),
	userAgent: text("user_agent"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, () => [
  index("idx_perf_component"),
  index("idx_perf_timestamp"),
  index("idx_perf_type"),
]);

export const spatialRefSys = pgTable("spatial_ref_sys", {
	srid: integer().notNull(),
	authName: varchar("auth_name", { length: 256 }),
	authSrid: integer("auth_srid"),
	srtext: varchar({ length: 2048 }),
	proj4Text: varchar({ length: 2048 }),
}, () => [
	check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
]);

export const apiCache = pgTable("api_cache", {
	id: serial().primaryKey().notNull(),
	cacheKey: varchar("cache_key", { length: 255 }).notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_api_cache_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_api_cache_key").using("btree", table.cacheKey.asc().nullsLast().op("text_ops")),
	unique("api_cache_cache_key_unique").on(table.cacheKey),
]);

export const errorLogs = pgTable("error_logs", {
	id: serial().primaryKey().notNull(),
	errorCode: varchar("error_code", { length: 50 }),
	message: text().notNull(),
	stack: text(),
	context: jsonb(),
	userAgent: text("user_agent"),
	url: text(),
	userId: varchar("user_id", { length: 100 }),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_error_code").using("btree", table.errorCode.asc().nullsLast().op("text_ops")),
	index("idx_error_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("idx_error_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const postalCodes = pgTable("postal_codes", {
	id: serial().primaryKey().notNull(),
	code: varchar({ length: 10 }).notNull(),
	granularity: varchar({ length: 20 }).notNull(),
	geometry: geometry({ type: "multipolygon", srid: 4326 }).notNull(),
	properties: jsonb(),
	bbox: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_postal_codes_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_postal_codes_geometry").using("gist", table.geometry.asc().nullsLast().op("gist_geometry_ops_2d")),
	index("idx_postal_codes_granularity").using("btree", table.granularity.asc().nullsLast().op("text_ops")),
	index("idx_postal_codes_granularity_code").using("btree", table.granularity.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
]);

export const states = pgTable("states", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 10 }).notNull(),
	geometry: geometry({ type: "multipolygon", srid: 4326 }).notNull(),
	properties: jsonb(),
	bbox: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_states_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_states_geometry").using("gist", table.geometry.asc().nullsLast().op("gist_geometry_ops_2d")),
	index("idx_states_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("states_code_unique").on(table.code),
]);