import { useEffect } from "react"
import { Map as MapLibreMap } from "maplibre-gl"
import { MapData } from "@/app/map/[granularity]/map-data"
import { useMapStore } from "@/lib/store/map-store"
import { useLassoSelection } from "./use-lasso-selection"
import { useRadiusSelection } from "./use-radius-selection"

interface DrawToolsProps {
  map: MapLibreMap | null
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
  onRadiusSelect,
}: DrawToolsProps) {
  const { setSelectedRegions } = useMapStore()

  // Initialize lasso selection
  useLassoSelection({
    map,
    isMapLoaded,
    data,
    granularity,
  })

  // Initialize radius selection
  useRadiusSelection({
    map,
    isMapLoaded,
    data,
    granularity,
    onRadiusSelect,
  })

  // Handle draw mode changes
  useEffect(() => {
    if (!map || !isMapLoaded) return

    // Update cursor based on draw mode
    if (drawMode === 'lasso') {
      map.getCanvas().style.cursor = 'crosshair'
    } else if (drawMode === 'radius') {
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.getCanvas().style.cursor = 'default'
    }
  }, [map, isMapLoaded, drawMode])
} 