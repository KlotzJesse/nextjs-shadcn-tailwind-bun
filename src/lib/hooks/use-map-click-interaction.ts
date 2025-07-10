import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import { isFeatureWithCode } from "@/lib/utils/map-feature-utils";
import type { Map as MapLibreMap } from "maplibre-gl";
import { toast } from "sonner";

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
  removeSelectedRegion: (regionId: string) => void
) {
  // Click handler for feature selection
  const handleClick = useStableCallback((...args: unknown[]) => {
    if (!map || !layersLoaded || !isCursorMode) return;

    const e = args[0] as { features?: unknown[] };
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    if (isFeatureWithCode(feature)) {
      const regionCode = feature.properties?.code;
      if (regionCode) {
        if (selectedRegions.includes(regionCode)) {
          removeSelectedRegion(regionCode);
          toast.success(`PLZ ${regionCode} abgewählt`, {
            duration: 1500,
          });
        } else {
          addSelectedRegion(regionCode);
          toast.success(`PLZ ${regionCode} ausgewählt`, {
            duration: 1500,
          });
        }
      }
    }
  });

  return {
    handleClick,
  } as const;
}
