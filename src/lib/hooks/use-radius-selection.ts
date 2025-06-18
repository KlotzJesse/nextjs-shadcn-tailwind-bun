import { useEffect, useRef } from "react"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from "@/lib/url-state/map-state"

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
  dragPan: { disable: () => void; enable: () => void };
  dragRotate: { disable: () => void; enable: () => void };
  scrollZoom: { disable: () => void; enable: () => void };
  doubleClickZoom: { disable: () => void; enable: () => void };
  touchZoomRotate: { disable: () => void; enable: () => void };
}

interface RadiusSelectionProps {
  map: MapInstance | null
  isMapLoaded: boolean
  data: MapData
  granularity: string
  enabled: boolean
}

export function useRadiusSelection({ 
  map, 
  isMapLoaded, 
  data, 
  granularity, 
  enabled 
}: RadiusSelectionProps) {
  const { addSelectedRegion, removeSelectedRegion, radius, setRadius } = useMapState()
  const isDrawing = useRef(false)
  const centerPoint = useRef<[number, number] | null>(null)
  const radiusRadius = useRef<number>(0)

  useEffect(() => {
    if (!map || !isMapLoaded) return

    const canvas = map.getCanvas()
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Disable map interactions when radius mode is enabled
    if (enabled) {
      map.dragPan.disable()
      map.dragRotate.disable()
      map.scrollZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoomRotate.disable()
    } else {
      // Re-enable map interactions when radius mode is disabled
      map.dragPan.enable()
      map.dragRotate.enable()
      map.scrollZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
      return
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!enabled) return
      
      isDrawing.current = true
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      centerPoint.current = [x, y]
      radiusRadius.current = 0
      
      // Start drawing
      ctx.beginPath()
      ctx.arc(x, y, 0, 0, 2 * Math.PI)
      ctx.strokeStyle = '#2563EB'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current || !enabled || !centerPoint.current) return
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const [cx, cy] = centerPoint.current
      const currentRadius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      
      // Clear previous drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw new circle
      ctx.beginPath()
      ctx.arc(cx, cy, currentRadius, 0, 2 * Math.PI)
      ctx.strokeStyle = '#2563EB'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      
      // Update radius state
      setRadius(Math.round(currentRadius))
    }

    const handleMouseUp = () => {
      if (!isDrawing.current || !enabled || !centerPoint.current) return
      
      isDrawing.current = false
      
      // Find features within the radius
      const selectedFeatures = findFeaturesInRadius()
      
      // Update selected regions
      selectedFeatures.forEach(featureId => {
        addSelectedRegion(featureId)
      })
      
      // Clear the drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      centerPoint.current = null
      radiusRadius.current = 0
    }

    const findFeaturesInRadius = (): string[] => {
      if (!centerPoint.current) return []
      
      const selectedFeatures: string[] = []
      const [cx, cy] = centerPoint.current
      const currentRadius = radiusRadius.current
      
      data.features.forEach((feature: any) => {
        // Check if feature centroid is within radius
        const centroid = getFeatureCentroid(feature)
        if (centroid) {
          const distance = Math.sqrt((centroid[0] - cx) ** 2 + (centroid[1] - cy) ** 2)
          if (distance <= currentRadius) {
            const featureId = feature.properties?.id || feature.properties?.PLZ || feature.properties?.plz
            if (featureId) {
              selectedFeatures.push(featureId)
            }
          }
        }
      })
      
      return selectedFeatures
    }

    const getFeatureCentroid = (feature: any): [number, number] | null => {
      // Simple centroid calculation - in a real app, use a proper geometry library
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0]
        const sumX = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0)
        const sumY = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0)
        return [sumX / coords.length, sumY / coords.length]
      }
      return null
    }

    // Add event listeners only when enabled
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)

    return () => {
      // Cleanup event listeners
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      
      // Re-enable map interactions on cleanup
      map.dragPan.enable()
      map.dragRotate.enable()
      map.scrollZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
      
      // Clear any remaining drawing
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [map, isMapLoaded, data, granularity, enabled, radius, addSelectedRegion, removeSelectedRegion, setRadius])
} 