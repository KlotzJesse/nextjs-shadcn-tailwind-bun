import { useEffect, useRef } from "react"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from "@/lib/url-state/map-state"

interface RadiusSelectionProps {
  map: any
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
  enabled 
}: RadiusSelectionProps) {
  const { addSelectedRegion, radius, setRadius } = useMapState()
  const isDrawing = useRef(false)
  const centerPoint = useRef<[number, number] | null>(null)
  const radiusCircle = useRef<string | null>(null)

  useEffect(() => {
    if (!map || !isMapLoaded || !enabled) return

    const canvas = map.getCanvas()
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const handleMouseDown = (e: MouseEvent) => {
      if (!enabled) return
      
      isDrawing.current = true
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      centerPoint.current = [x, y]
      
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
      
      // Call callback if provided
      if (onRadiusSelect) {
        onRadiusSelect(radius)
      }
    }

    const findFeaturesInRadius = (): string[] => {
      if (!centerPoint.current) return []
      
      const selectedFeatures: string[] = []
      const [cx, cy] = centerPoint.current
      const currentRadius = radius
      
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

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
    }
  }, [map, isMapLoaded, data, granularity, enabled, radius, onRadiusSelect, addSelectedRegion, setRadius])
} 