import { useMapState } from "@/lib/url-state/map-state";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import type { Map as MapLibre } from "maplibre-gl";
import { useEffect, useRef } from "react";

interface RadiusSelectionProps {
  map: MapLibre | null;
  isMapLoaded: boolean;
  data: FeatureCollection<MultiPolygon | Polygon, GeoJsonProperties>;
  granularity: string;
  onRadiusSelect?: (radius: number) => void;
  enabled: boolean;
}

/**
 * @deprecated This hook is deprecated - functionality moved to layer-based system with server actions
 * Keeping minimal implementation to avoid breaking changes in existing components
 */
export function useRadiusSelection({
  map,
  isMapLoaded,
  data,
  granularity,
  enabled,
}: RadiusSelectionProps) {
  const { radius, setRadius } = useMapState();
  const isDrawing = useRef(false);
  const centerPoint = useRef<[number, number] | null>(null);
  const radiusRadius = useRef<number>(0);

  useEffect(() => {
    // No-op - legacy hook, functionality moved to server actions
    if (!map || !isMapLoaded || !enabled) return;

    // Minimal cleanup to prevent memory leaks
    return () => {
      if (map && map.getCanvas()) {
        const canvas = map.getCanvas();
        canvas.style.cursor = "";
      }
    };
  }, [map, isMapLoaded, data, granularity, enabled, radius, setRadius]);
}
