import { useMapState } from "@/lib/url-state/map-state"
import { useCursorSelection } from "./use-cursor-selection"
import { useLassoSelection } from "./use-lasso-selection"
import { useRadiusSelection } from "./use-radius-selection"

import type { MapData } from "@/lib/types/map-data"
import type { MapboxMap } from "@/lib/types/mapbox"

interface SelectionModeManagerProps {
  map: MapboxMap | null;
  isMapLoaded: boolean;
  data: MapData;
  layerId: string;
}

export function useSelectionModeManager({ map, isMapLoaded, data, layerId }: SelectionModeManagerProps) {
  const { selectionMode } = useMapState()

  // Cursor selection (default)
  useCursorSelection({
    map,
    isMapLoaded,
    layerId,
    enabled: selectionMode === 'cursor',
  })

  useLassoSelection({
    map,
    isMapLoaded,
    data,
    granularity: layerId, // assuming granularity is layerId
    enabled: selectionMode === 'lasso',
  })

  useRadiusSelection({
    map,
    isMapLoaded,
    data,
    granularity: layerId, // assuming granularity is layerId
    enabled: selectionMode === 'radius',
  })
}