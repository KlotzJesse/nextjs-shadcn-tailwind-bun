import { useEffect, useRef } from "react"
import type { MapData } from "@/app/map/[granularity]/map-data"
import { useMapStore } from "@/lib/store/map-store"

interface MapInstance {
  on: (type: string, listener: (e: any) => void) => void;
  off: (type: string, listener: (e: any) => void) => void;
  addSource: (id: string, source: any) => void;
  removeSource: (id: string) => void;
  addLayer: (layer: any) => void;
  removeLayer: (id: string) => void;
  getSource: (id: string) => any;
  setFilter: (layerId: string, filter: any[]) => void;
  remove: () => void;
  getCanvas: () => HTMLCanvasElement;
}

interface LassoSelectionProps {
  map: MapInstance | null
  isMapLoaded: boolean
  data: MapData
  granularity: string
  enabled: boolean
}

export function useLassoSelection({ map, isMapLoaded, data, granularity, enabled }: LassoSelectionProps) {
  const pointsRef = useRef<number[][]>([])
  const isDrawingRef = useRef(false)
  const { setSelectedRegions } = useMapStore()

  useEffect(() => {
    if (!map || !isMapLoaded || !enabled) return

    // Create source and layer for lasso polygon if they don't exist
    if (!map.getSource('lasso-source')) {
      map.addSource('lasso-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      })

      map.addLayer({
        id: 'lasso-polygon',
        type: 'fill',
        source: 'lasso-source',
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.3,
          'fill-outline-color': '#000'
        }
      })
    }

    const handleMouseDown = (e: any) => {
      if (!enabled) return
      isDrawingRef.current = true
      pointsRef.current = [[e.lngLat.lng, e.lngLat.lat]]
      
      // Update polygon immediately to show first point
      map.getSource('lasso-source')?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [pointsRef.current]
        }
      })
    }

    const handleMouseMove = (e: any) => {
      if (!isDrawingRef.current || !enabled) return
      
      const newPoint = [e.lngLat.lng, e.lngLat.lat]
      pointsRef.current.push(newPoint)

      // Only update polygon if we have at least 3 points
      if (pointsRef.current.length >= 3) {
        // Close the polygon by adding the first point at the end
        const closedPoints = [...pointsRef.current, pointsRef.current[0]]
        
        map.getSource('lasso-source')?.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [closedPoints]
          }
        })
      }
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !enabled) return
      isDrawingRef.current = false

      // Only process selection if we have at least 3 points
      if (pointsRef.current.length >= 3) {
        // Close the polygon
        const closedPoints = [...pointsRef.current, pointsRef.current[0]]
        
        // Find intersecting features
        const selectedIds = data.features
          .filter(feature => {
            // TODO: Implement proper polygon intersection check
            return true
          })
          .map(feature => feature.properties.id)

        // Clear the lasso
        pointsRef.current = []
        map.getSource('lasso-source')?.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        })
      }
    }

    // Add event listeners
    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove)
    map.on('mouseup', handleMouseUp)

    return () => {
      // Remove event listeners
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)

      // Clean up source and layer
      if (map.getSource('lasso-source')) {
        map.removeLayer('lasso-polygon')
        map.removeSource('lasso-source')
      }
    }
  }, [map, isMapLoaded, data, granularity, enabled])
} 