import { useEffect } from "react"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from "@/lib/url-state/map-state"
import { useLassoSelection } from "./use-lasso-selection"
import { useRadiusSelection } from "./use-radius-selection"

interface DrawToolsProps {
  map: any
  isMapLoaded: boolean
  data: MapData
  granularity: string
  drawMode: 'lasso' | 'radius' | null
  onSearch: (plz: string) => void
  onRadiusSelect: (radius: number) => void
}

export function useMapDrawTools({ 
  map, 
  isMapLoaded, 
  data, 
  granularity, 
  drawMode, 
  onSearch, 
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
      map.keyboard.disable()
      map.doubleClickZoom.disable()
      map.touchZoomRotate.disable()
    } else {
      map.dragPan.enable()
      map.dragRotate.enable()
      map.scrollZoom.enable()
      map.keyboard.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
    }

    return () => {
      // Re-enable interactions on cleanup
      if (map) {
        map.dragPan.enable()
        map.dragRotate.enable()
        map.scrollZoom.enable()
        map.keyboard.enable()
        map.doubleClickZoom.enable()
        map.touchZoomRotate.enable()
      }
    }
  }, [map, isMapLoaded, drawMode])
} 