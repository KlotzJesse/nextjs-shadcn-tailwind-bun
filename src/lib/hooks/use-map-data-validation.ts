import type { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import { useMemo } from "react";

/**
 * Hook for validating map data with memoized results
 * Prevents unnecessary re-validation on each render
 */
export function useMapDataValidation(
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
) {
  return useMemo(() => {
    if (!data) {
      return {
        isValid: false,
        errorMessage: "Map data is missing.",
      };
    }

    if (!data.features) {
      return {
        isValid: false,
        errorMessage: "Map data features are missing.",
      };
    }

    if (data.features.length === 0) {
      return {
        isValid: false,
        errorMessage: "Map data is empty. Please try reloading or select a different granularity.",
      };
    }

    return {
      isValid: true,
      errorMessage: null,
    };
  }, [data]);
}
