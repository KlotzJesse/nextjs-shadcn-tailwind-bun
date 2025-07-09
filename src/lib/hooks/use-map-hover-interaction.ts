import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useRef } from "react";

/**
 * Hook for managing hover state and interactions
 * Optimized for performance with ref-based state tracking
 */
export function useMapHoverInteraction(
  map: MapLibreMap | null,
  layerId: string,
  layersLoaded: boolean,
  isCursorMode: boolean
) {
  // Use ref to avoid re-renders when hover state changes
  const hoveredRegionIdRef = useRef<string | null>(null);

  // Memoized helper to check if feature has code property
  const isFeatureWithCode = useCallback((
    obj: unknown
  ): obj is { properties?: { code?: string } } => {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "properties" in obj &&
      typeof (obj as { properties?: unknown }).properties === "object" &&
      (obj as { properties?: unknown }).properties !== null &&
      "code" in (obj as { properties: { code?: unknown } }).properties
    );
  }, []);

  // Core hover processing logic
  const processHover = useCallback(
    (...args: unknown[]) => {
      if (!map || !layersLoaded || !isCursorMode) return;

      const hoverSourceId = `${layerId}-hover-source`;
      const hoverLayerId = `${layerId}-hover-layer`;
      const e = args[0] as { features?: unknown[] };

      if (e && Array.isArray(e.features) && e.features.length > 0) {
        const feature = e.features[0];
        if (isFeatureWithCode(feature)) {
          const regionCode = feature.properties?.code;
          if (regionCode && hoveredRegionIdRef.current !== regionCode) {
            const src = map.getSource(hoverSourceId);
            if (src && "setData" in src && typeof src.setData === "function") {
              src.setData({
                type: "FeatureCollection",
                features: [feature],
              });
            }
            map.setLayoutProperty(hoverLayerId, "visibility", "visible");
            const canvas = map.getCanvas();
            if (canvas) canvas.style.cursor = "pointer";
            hoveredRegionIdRef.current = regionCode;
          }
        }
      }
    },
    [map, layerId, layersLoaded, isCursorMode, isFeatureWithCode]
  );

  // Mouse enter handler
  const handleMouseEnter = useCallback(
    (...args: unknown[]) => {
      processHover(...args);
    },
    [processHover]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (...args: unknown[]) => {
      processHover(...args);
    },
    [processHover]
  );

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    if (!map || !layersLoaded || !isCursorMode) return;

    const hoverSourceId = `${layerId}-hover-source`;
    const hoverLayerId = `${layerId}-hover-layer`;
    const src = map.getSource(hoverSourceId);

    if (src && "setData" in src && typeof src.setData === "function") {
      src.setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    if (map) {
      map.setLayoutProperty(hoverLayerId, "visibility", "none");
      const canvas = map.getCanvas();
      if (canvas) canvas.style.cursor = "grab";
    }

    hoveredRegionIdRef.current = null;
  }, [map, layerId, layersLoaded, isCursorMode]);

  return {
    hoveredRegionIdRef,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    isFeatureWithCode,
  } as const;
}
