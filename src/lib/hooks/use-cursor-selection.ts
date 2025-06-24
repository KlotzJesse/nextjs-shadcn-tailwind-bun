import { useEffect, useCallback, useRef } from "react"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"

interface CursorSelectionProps {
  map: any
  isMapLoaded: boolean
  data: MapData
  layerId: string
  enabled: boolean
}

export function useCursorSelection({ map, isMapLoaded, data, layerId, enabled }: CursorSelectionProps) {
  const { selectedRegions, addSelectedRegion, removeSelectedRegion } = useMapState()

  // Track last hovered region to avoid redundant setFilter calls
  const lastRegionIdRef = useRef<string | null>(null)
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null)
  const pendingEvent = useRef<any>(null)

  // Click handler for selecting/deselecting regions
  const handleClick = useCallback((e: any) => {
    if (!map || !enabled || !e.features || e.features.length === 0) return
    const feature = e.features[0]
    const regionId = feature.properties?.id
    if (regionId) {
      if (selectedRegions.includes(regionId)) {
        removeSelectedRegion(regionId)
      } else {
        addSelectedRegion(regionId)
      }
    }
  }, [map, enabled, selectedRegions, addSelectedRegion, removeSelectedRegion])

  // Throttled hover handler
  const processHover = useCallback((e: any) => {
    if (!map || !enabled) return
    const hoverLayerId = `${layerId}-hover`
    if (e.features && e.features.length > 0) {
      const feature = e.features[0]
      const regionId = feature.properties?.id
      if (regionId && lastRegionIdRef.current !== regionId) {
        map.setFilter(hoverLayerId, ['==', 'id', regionId])
        map.setLayoutProperty(hoverLayerId, 'visibility', 'visible')
        map.getCanvas().style.cursor = 'pointer'
        lastRegionIdRef.current = regionId
      }
    } else {
      if (lastRegionIdRef.current !== null) {
        map.setLayoutProperty(hoverLayerId, 'visibility', 'none')
        map.getCanvas().style.cursor = ''
        lastRegionIdRef.current = null
      }
    }
  }, [map, enabled, layerId])

  // Throttle wrapper
  const handleMouseMove = useCallback((e: any) => {
    if (throttleTimeout.current) {
      pendingEvent.current = e
      return
    }
    processHover(e)
    throttleTimeout.current = setTimeout(() => {
      throttleTimeout.current = null
      if (pendingEvent.current) {
        processHover(pendingEvent.current)
        pendingEvent.current = null
      }
    }, 32) // ~30fps
  }, [processHover])

  const handleMouseLeave = useCallback(() => {
    if (!map || !enabled) return
    const hoverLayerId = `${layerId}-hover`
    map.getCanvas().style.cursor = ''
    map.setLayoutProperty(hoverLayerId, 'visibility', 'none')
    lastRegionIdRef.current = null
  }, [map, enabled, layerId])

  useEffect(() => {
    if (!map || !isMapLoaded || !enabled) return
    const mainLayerId = `${layerId}-layer`
    map.on('click', mainLayerId, handleClick)
    map.on('mousemove', mainLayerId, handleMouseMove)
    map.on('mouseleave', mainLayerId, handleMouseLeave)
    return () => {
      if (map) {
        map.off('click', mainLayerId, handleClick)
        map.off('mousemove', mainLayerId, handleMouseMove)
        map.off('mouseleave', mainLayerId, handleMouseLeave)
      }
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current)
        throttleTimeout.current = null
      }
      pendingEvent.current = null
      lastRegionIdRef.current = null
    }
  }, [map, isMapLoaded, enabled, layerId, handleClick, handleMouseMove, handleMouseLeave])
} 