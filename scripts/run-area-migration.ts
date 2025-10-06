import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL!;

const migrationSQL = `
-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  granularity VARCHAR(20) NOT NULL DEFAULT '5digit',
  is_archived VARCHAR(5) NOT NULL DEFAULT 'false',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_areas_name ON areas USING btree (name);
CREATE INDEX IF NOT EXISTS idx_areas_created_at ON areas USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_areas_is_archived ON areas USING btree (is_archived);

-- Create area_versions table
CREATE TABLE IF NOT EXISTS area_versions (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  snapshot JSONB NOT NULL,
  changes_summary TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (area_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_area_versions_area_id ON area_versions USING btree (area_id);
CREATE INDEX IF NOT EXISTS idx_area_versions_created_at ON area_versions USING btree (created_at);

-- Create area_layers table
CREATE TABLE IF NOT EXISTS area_layers (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  opacity INTEGER NOT NULL DEFAULT 70,
  is_visible VARCHAR(5) NOT NULL DEFAULT 'true',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_area_layers_area_id ON area_layers USING btree (area_id);
CREATE INDEX IF NOT EXISTS idx_area_layers_order ON area_layers USING btree (area_id, order_index);

-- Create area_layer_postal_codes table
CREATE TABLE IF NOT EXISTS area_layer_postal_codes (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (layer_id, postal_code)
);

CREATE INDEX IF NOT EXISTS idx_area_layer_postal_codes_layer_id ON area_layer_postal_codes USING btree (layer_id);
CREATE INDEX IF NOT EXISTS idx_area_layer_postal_codes_postal_code ON area_layer_postal_codes USING btree (postal_code);
`;

async function runMigration() {
  const pool = new Pool({ connectionString });

  try {
    console.log("🔄 Starting area management migration...");
    await pool.query(migrationSQL);
    console.log("✅ Migration completed successfully!");
    console.log("\nCreated tables:");
    console.log("  - areas");
    console.log("  - area_versions");
    console.log("  - area_layers");
    console.log("  - area_layer_postal_codes");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
