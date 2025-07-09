import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback } from "react";

/**
 * Hook for managing click interactions and feature selection
 * Optimized for performance with stable callbacks
 */
export function useMapClickInteraction(
  map: MapLibreMap | null,
  layersLoaded: boolean,
  isCursorMode: boolean,
  selectedRegions: string[],
  addSelectedRegion: (regionId: string) => void,
  removeSelectedRegion: (regionId: string) => void,
  isFeatureWithCode: (obj: unknown) => obj is { properties?: { code?: string } }
) {
  // Click handler for feature selection
  const handleClick = useCallback(
    (...args: unknown[]) => {
      if (!map || !layersLoaded || !isCursorMode) return;

      const e = args[0] as { features?: unknown[] };
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      if (isFeatureWithCode(feature)) {
        const regionCode = feature.properties?.code;
        if (regionCode) {
          if (selectedRegions.includes(regionCode)) {
            removeSelectedRegion(regionCode);
          } else {
            addSelectedRegion(regionCode);
          }
        }
      }
    },
    [
      map,
      layersLoaded,
      isCursorMode,
      selectedRegions,
      addSelectedRegion,
      removeSelectedRegion,
      isFeatureWithCode,
    ]
  );

  return {
    handleClick,
  } as const;
}
