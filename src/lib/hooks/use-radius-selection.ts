import { useEffect, useRef } from "react"
import { Map as MapLibreMap } from "maplibre-gl"
import { MapData } from "@/app/map/[granularity]/map-data"
import * as turf from "@turf/turf"
import { useMapStore } from "@/lib/store/map-store"

interface RadiusSelectionProps {
  map: MapLibreMap | null
  isMapLoaded: boolean
  data: MapData
  granularity: string
  onRadiusSelect?: (radius: number) => void
  enabled: boolean
}

export function useRadiusSelection({
  map,
  isMapLoaded,
  data,
  granularity,
  onRadiusSelect,
  enabled,
}: RadiusSelectionProps) {
  const centerRef = useRef<[number, number] | null>(null)
  const radiusRef = useRef<number>(0)
  const { setSelectedRegions } = useMapStore()

  useEffect(() => {
    if (!map || !isMapLoaded || !enabled) return

    const handleMouseDown = (e: any) => {
      if (!map) return
      
      // Clear existing sources and layers
      if (map.getSource('radius-circle')) {
        map.removeLayer('radius-circle')
        map.removeSource('radius-circle')
      }

      centerRef.current = [e.lngLat.lng, e.lngLat.lat]
      radiusRef.current = 0
      
      // Add source and layer for the circle
      map.addSource('radius-circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: centerRef.current
          }
        }
      })

      map.addLayer({
        id: 'radius-circle',
        type: 'circle',
        source: 'radius-circle',
        paint: {
          'circle-radius': 0,
          'circle-color': '#088',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000'
        }
      })
    }

    const handleMouseMove = (e: any) => {
      if (!map || !centerRef.current) return

      // Calculate radius based on distance from center
      const center = turf.point(centerRef.current)
      const point = turf.point([e.lngLat.lng, e.lngLat.lat])
      radiusRef.current = turf.distance(center, point, { units: 'kilometers' })

      // Update the circle
      if (map.getSource('radius-circle')) {
        (map.getSource('radius-circle') as any).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: centerRef.current
          }
        })

        map.setPaintProperty('radius-circle', 'circle-radius', radiusRef.current * 1000) // Convert to meters
      }
    }

    const handleMouseUp = () => {
      if (!map || !centerRef.current || radiusRef.current === 0) return

      // Create a circle from the center and radius
      const center = turf.point(centerRef.current)
      const circle = turf.circle(center, radiusRef.current, { units: 'kilometers' })

      // Find features that intersect with the circle
      const selectedFeatures = data.features.filter((feature: any) => {
        try {
          return turf.booleanIntersects(feature, circle)
        } catch (error) {
          return false
        }
      })

      // Update selected regions
      const selectedIds = selectedFeatures.map((feature: any) => feature.properties?.id)
      setSelectedRegions(selectedIds)

      // Call onRadiusSelect callback
      if (onRadiusSelect) {
        onRadiusSelect(radiusRef.current)
      }

      // Clean up
      centerRef.current = null
      radiusRef.current = 0
      if (map.getSource('radius-circle')) {
        map.removeLayer('radius-circle')
        map.removeSource('radius-circle')
      }
    }

    // Add event listeners
    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove)
    map.on('mouseup', handleMouseUp)

    // Cleanup
    return () => {
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      
      if (map.getSource('radius-circle')) {
        map.removeLayer('radius-circle')
        map.removeSource('radius-circle')
      }
    }
  }, [map, isMapLoaded, data, granularity, setSelectedRegions, onRadiusSelect, enabled])
} 