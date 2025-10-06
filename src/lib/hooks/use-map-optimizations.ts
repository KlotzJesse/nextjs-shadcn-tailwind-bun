import {
  featureCollectionFromIds,
  makeLabelPoints,
} from "@/lib/utils/map-data";
import type {
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";
import { useMemo } from "react";
import { useStableCallback } from "./use-stable-callback";

interface UseMapOptimizationsProps {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
}

/**
 * Hook for optimized memoization of heavy computations
 * Prevents unnecessary re-renders and recalculations
 * Optimized for React 19 with stable references
 * Note: Selected regions are now managed per-layer, not globally
 */
export function useMapOptimizations({
  data,
  statesData,
}: UseMapOptimizationsProps) {
  // Empty feature collection for compatibility
  const selectedFeatureCollection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [] as import("geojson").Feature<
        Polygon | MultiPolygon,
        GeoJsonProperties
      >[],
    };
  }, []);

  // Memoize label points computation (expensive operation)
  const labelPoints = useMemo(() => {
    return makeLabelPoints(data) as FeatureCollection<
      Geometry,
      GeoJsonProperties
    >;
  }, [data]);

  // Memoize states label points if available
  const statesLabelPoints = useMemo(() => {
    return statesData
      ? (makeLabelPoints(statesData) as FeatureCollection<
          Geometry,
          GeoJsonProperties
        >)
      : null;
  }, [statesData]);

  // Memoize feature count for performance monitoring
  const featureCount = useMemo(
    () => data.features.length,
    [data.features.length]
  );

  // Selected count is now managed per-layer
  const selectedCount = 0;

  // Memoize data extent for bounds calculations
  const dataExtent = useMemo(() => {
    if (!data.features.length) return null;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    data.features.forEach((feature) => {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0].forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((polygon) => {
          polygon[0].forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          });
        });
      }
    });

    return { minLng, maxLng, minLat, maxLat };
  }, [data]);

  // Stable callback functions for layer usage
  // Note: Returns empty collection since selections are now per-layer
  const getSelectedFeatureCollection = useStableCallback(() => {
    return {
      type: "FeatureCollection" as const,
      features: [],
    } as FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  });

  const getLabelPoints = useStableCallback(
    (d: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>) => {
      return makeLabelPoints(d) as FeatureCollection<
        Geometry,
        GeoJsonProperties
      >;
    }
  );

  return {
    selectedFeatureCollection,
    labelPoints,
    statesLabelPoints,
    featureCount,
    selectedCount,
    dataExtent,
    getSelectedFeatureCollection,
    getLabelPoints,
  } as const;
}
