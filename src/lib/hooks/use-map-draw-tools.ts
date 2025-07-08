import { useEffect } from "react"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from "@/lib/url-state/map-state"

import type { MapboxMap } from "@/lib/types/mapbox"

interface DrawToolsProps {
  map: MapboxMap | null;
  isMapLoaded: boolean;
  data: MapData;
  granularity: string;
  drawMode: 'lasso' | 'radius' | null;
  onRadiusSelect: (radius: number) => void;
}

export function useMapDrawTools({ 
  map, 
  isMapLoaded, 
  data, 
  granularity, 
  drawMode, 
  onRadiusSelect 
}: DrawToolsProps) {
  const { selectionMode } = useMapState()

  // Use lasso selection when in lasso mode
  useLassoSelection({
    map,
    isMapLoaded,
    data,
    granularity,
    enabled: selectionMode === 'lasso' && drawMode === 'lasso'
  })

  // Use radius selection when in radius mode
  useRadiusSelection({
    map,
    isMapLoaded,
    data,
    granularity,
    onRadiusSelect,
    enabled: selectionMode === 'radius' && drawMode === 'radius'
  })

  // Handle mode changes
  useEffect(() => {
    if (!map || !isMapLoaded) return

    // Disable map interactions when in draw mode
    if (drawMode) {
      map.dragPan.disable()
      map.dragRotate.disable()
      map.scrollZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoomRotate.disable()
    } else {
      map.dragPan.enable()
      map.dragRotate.enable()
      map.scrollZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
    }

    return () => {
      // Re-enable interactions on cleanup
      if (map) {
        map.dragPan.enable()
        map.dragRotate.enable()
        map.scrollZoom.enable()
        map.doubleClickZoom.enable()
        map.touchZoomRotate.enable()
      }
    }
  }, [map, isMapLoaded, drawMode])
} 