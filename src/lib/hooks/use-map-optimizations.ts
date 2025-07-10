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
  selectedRegions: string[];
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
}

/**
 * Hook for optimized memoization of heavy computations
 * Prevents unnecessary re-renders and recalculations
 * Optimized for React 19 with stable references
 */
export function useMapOptimizations({
  data,
  selectedRegions,
  statesData,
}: UseMapOptimizationsProps) {
  // Memoize selected feature collection computation
  const selectedFeatureCollection = useMemo(() => {
    const fc = featureCollectionFromIds(data, selectedRegions);
    return {
      ...fc,
      features: fc.features.filter(
        (
          f
        ): f is import("geojson").Feature<
          Polygon | MultiPolygon,
          GeoJsonProperties
        > => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
      ),
    };
  }, [data, selectedRegions]);

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

  // Memoize selected count
  const selectedCount = useMemo(
    () => selectedRegions.length,
    [selectedRegions.length]
  );

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
  const getSelectedFeatureCollection = useStableCallback(() => {
    return featureCollectionFromIds(data, selectedRegions) as FeatureCollection<
      Polygon | MultiPolygon,
      GeoJsonProperties
    >;
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
