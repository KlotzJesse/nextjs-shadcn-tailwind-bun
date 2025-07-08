-- Migration: Add B-tree indexes for query performance
CREATE INDEX IF NOT EXISTS idx_postal_codes_granularity ON postal_codes (granularity);
CREATE INDEX IF NOT EXISTS idx_postal_codes_code ON postal_codes (code);
