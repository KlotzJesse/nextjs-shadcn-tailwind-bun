import { useMapState } from "@/lib/url-state/map-state"
import { useCursorSelection } from "./use-cursor-selection"
import { useLassoSelection } from "./use-lasso-selection"
import { useRadiusSelection } from "./use-radius-selection"
import type { MapData } from "@/lib/types/map-data"

interface SelectionModeManagerProps {
  map: any
  isMapLoaded: boolean
  data: MapData
  layerId: string
}

export function useSelectionModeManager({ map, isMapLoaded, data, layerId }: SelectionModeManagerProps) {
  const { selectionMode } = useMapState()

  // Cursor selection (default)
  useCursorSelection({
    map,
    isMapLoaded,
    data,
    layerId,
    enabled: selectionMode === 'cursor',
  })

  // Lasso selection
  useLassoSelection({
    map,
    isMapLoaded,
    data,
    layerId,
    enabled: selectionMode === 'lasso',
  })

  // Radius selection
  useRadiusSelection({
    map,
    isMapLoaded,
    data,
    layerId,
    enabled: selectionMode === 'radius',
  })
} 