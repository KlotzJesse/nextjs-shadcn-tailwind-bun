import type { Geometry } from "geojson";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import { useState } from "react";
import { toast } from "sonner";
import { useStableCallback } from "./use-stable-callback";

interface PostalCodeLookupResult {
  code: string;
  geometry: Geometry | null;
  properties: GeoJsonProperties;
  found: boolean;
}

interface UsePostalCodeLookupOptions {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  onPostalCodeFound?: (code: string, geometry: Geometry) => void;
}

export function usePostalCodeLookup({
  data,
  onPostalCodeFound,
}: UsePostalCodeLookupOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastLookupResult, setLastLookupResult] =
    useState<PostalCodeLookupResult | null>(null);

  const lookupPostalCode = useStableCallback(async (postalCode: string) => {
    setIsLoading(true);

    try {
      // First try to find the postal code in the current data
      const normalizedCode = postalCode.trim().toUpperCase();
      const feature = data.features.find((f) => {
        const code =
          f.properties?.code || f.properties?.PLZ || f.properties?.plz;
        return code && code.toString().toUpperCase() === normalizedCode;
      });

      if (feature) {
        const result: PostalCodeLookupResult = {
          code: normalizedCode,
          geometry: feature.geometry,
          properties: feature.properties,
          found: true,
        };

        setLastLookupResult(result);

        if (onPostalCodeFound) {
          onPostalCodeFound(normalizedCode, feature.geometry);
        }

        toast.success(`Found postal code: ${normalizedCode}`);
        return result;
      } else {
        // If not found in current data, show appropriate message
        const result: PostalCodeLookupResult = {
          code: normalizedCode,
          geometry: null,
          properties: null,
          found: false,
        };

        setLastLookupResult(result);
        toast.error(`Postal code ${normalizedCode} not found in current view`);
        return result;
      }
    } catch (error) {
      console.error("Postal code lookup error:", error);
      toast.error("Failed to lookup postal code");
      return null;
    } finally {
      setIsLoading(false);
    }
  });

  const clearLastLookup = useStableCallback(() => {
    setLastLookupResult(null);
  });

  // Helper function to find postal code by coordinates
  const findPostalCodeByCoords = useStableCallback(
    (lng: number, lat: number) => {
      // Point-in-polygon helper (ray-casting)
      function isPointInPolygon(
        point: [number, number],
        polygon: number[][]
      ): boolean {
        let inside = false;
        const [x, y] = point;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const [xi, yi] = polygon[i];
          const [xj, yj] = polygon[j];
          if (
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
          ) {
            inside = !inside;
          }
        }
        return inside;
      }

      // Check each feature
      for (const feature of data.features) {
        if (feature.geometry.type === "Polygon") {
          const polygon = feature.geometry.coordinates[0];
          if (isPointInPolygon([lng, lat], polygon as number[][])) {
            return (
              feature.properties?.code ||
              feature.properties?.PLZ ||
              feature.properties?.plz
            );
          }
        } else if (feature.geometry.type === "MultiPolygon") {
          for (const poly of feature.geometry.coordinates) {
            if (Array.isArray(poly) && Array.isArray(poly[0])) {
              if (isPointInPolygon([lng, lat], poly[0] as number[][])) {
                return (
                  feature.properties?.code ||
                  feature.properties?.PLZ ||
                  feature.properties?.plz
                );
              }
            }
          }
        }
      }
      return null;
    }
  );

  return {
    lookupPostalCode,
    findPostalCodeByCoords,
    isLoading,
    lastLookupResult,
    clearLastLookup,
  };
}
