import { useMapState } from "@/lib/url-state/map-state"
import { useCursorSelection } from "./use-cursor-selection"
import { useLassoSelection } from "./use-lasso-selection"
import { useRadiusSelection } from "./use-radius-selection"

import { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson"
import type { Map as MapLibre } from 'maplibre-gl'


interface SelectionModeManagerProps {
  map: MapLibre | null;
  isMapLoaded: boolean;
  data: FeatureCollection<MultiPolygon | Polygon, GeoJsonProperties>;
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