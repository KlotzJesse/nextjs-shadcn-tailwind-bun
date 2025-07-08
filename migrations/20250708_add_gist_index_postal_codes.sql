-- Migration: Ensure GiST index on geometry for fast spatial queries
CREATE INDEX IF NOT EXISTS idx_postal_codes_geom ON postal_codes USING GIST (geometry);
