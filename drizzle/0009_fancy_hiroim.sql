-- Migrate all simple serial IDs to GENERATED ALWAYS AS IDENTITY
-- Since sequences already exist, we need to alter them to be GENERATED ALWAYS AS IDENTITY

-- For api_cache
ALTER TABLE "api_cache" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "api_cache_id_seq" OWNED BY "api_cache"."id";--> statement-breakpoint
ALTER TABLE "api_cache" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For area_layer_postal_codes
ALTER TABLE "area_layer_postal_codes" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "area_layer_postal_codes_id_seq" OWNED BY "area_layer_postal_codes"."id";--> statement-breakpoint
ALTER TABLE "area_layer_postal_codes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For area_layers
ALTER TABLE "area_layers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "area_layers_id_seq" OWNED BY "area_layers"."id";--> statement-breakpoint
ALTER TABLE "area_layers" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For area_undo_stacks
ALTER TABLE "area_undo_stacks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "area_undo_stacks_id_seq" OWNED BY "area_undo_stacks"."id";--> statement-breakpoint
ALTER TABLE "area_undo_stacks" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For areas
ALTER TABLE "areas" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "areas_id_seq" OWNED BY "areas"."id";--> statement-breakpoint
ALTER TABLE "areas" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For error_logs
ALTER TABLE "error_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "error_logs_id_seq" OWNED BY "error_logs"."id";--> statement-breakpoint
ALTER TABLE "error_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For performance_metrics
ALTER TABLE "performance_metrics" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "performance_metrics_id_seq" OWNED BY "performance_metrics"."id";--> statement-breakpoint
ALTER TABLE "performance_metrics" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For postal_codes
ALTER TABLE "postal_codes" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "postal_codes_id_seq" OWNED BY "postal_codes"."id";--> statement-breakpoint
ALTER TABLE "postal_codes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For states
ALTER TABLE "states" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER SEQUENCE "states_id_seq" OWNED BY "states"."id";--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);--> statement-breakpoint

-- For scoped sequences (versionNumber and sequenceNumber), we need trigger-based approaches
-- Create trigger function for area_versions.versionNumber scoped by areaId
CREATE OR REPLACE FUNCTION set_area_version_number()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  IF NEW.version_number IS NULL OR NEW.version_number = 0 THEN
    -- Lock the parent area row to prevent concurrent version creation
    PERFORM 1 FROM areas WHERE id = NEW.area_id FOR UPDATE;

    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM area_versions
    WHERE area_id = NEW.area_id;

    NEW.version_number := next_version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Create trigger for area_versions
DROP TRIGGER IF EXISTS trg_set_area_version_number ON area_versions;--> statement-breakpoint
CREATE TRIGGER trg_set_area_version_number
BEFORE INSERT ON area_versions
FOR EACH ROW
EXECUTE FUNCTION set_area_version_number();--> statement-breakpoint

-- Create trigger function for area_changes.sequenceNumber scoped by (areaId, versionAreaId, versionNumber)
CREATE OR REPLACE FUNCTION set_area_change_sequence_number()
RETURNS TRIGGER AS $$
DECLARE
  next_sequence INTEGER;
BEGIN
  IF NEW.sequence_number IS NULL OR NEW.sequence_number = 0 THEN
    -- Lock the version row to prevent concurrent change creation
    IF NEW.version_area_id IS NOT NULL AND NEW.version_number IS NOT NULL THEN
      PERFORM 1 FROM area_versions
      WHERE area_id = NEW.version_area_id
        AND version_number = NEW.version_number
      FOR UPDATE;
    END IF;

    -- Get the next sequence number
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO next_sequence
    FROM area_changes
    WHERE area_id = NEW.area_id
      AND version_area_id IS NOT DISTINCT FROM NEW.version_area_id
      AND version_number IS NOT DISTINCT FROM NEW.version_number;

    NEW.sequence_number := next_sequence;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Create trigger for area_changes
DROP TRIGGER IF EXISTS trg_set_area_change_sequence_number ON area_changes;--> statement-breakpoint
CREATE TRIGGER trg_set_area_change_sequence_number
BEFORE INSERT ON area_changes
FOR EACH ROW
EXECUTE FUNCTION set_area_change_sequence_number();