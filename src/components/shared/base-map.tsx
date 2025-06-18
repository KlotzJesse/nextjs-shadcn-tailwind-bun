"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"
import { useTerraDraw, TerraDrawMode } from "@/lib/hooks/use-terradraw"
import { DrawingTools } from "./drawing-tools"

interface BaseMapProps {
  data: MapData
  layerId: string
  onSearch?: (query: string) => void
  center?: [number, number]
  zoom?: number
}

export function BaseMap({ 
  data, 
  layerId, 
  center = [10.4515, 51.1657], 
  zoom = 5 
}: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const [layersLoaded, setLayersLoaded] = useState(false)
  const [currentDrawingMode, setCurrentDrawingMode] = useState<TerraDrawMode | null>(null)
  const [isDrawingToolsVisible, setIsDrawingToolsVisible] = useState(true)
  const { selectedRegions, addSelectedRegion, removeSelectedRegion, selectionMode, setSelectedRegions } = useMapState()

  // Helper functions for feature selection
  const getFeatureCentroid = useCallback((feature: any): [number, number] | null => {
    console.log(`\n--- CENTROID CALCULATION DEBUG ---`)
    console.log(`Feature ID:`, feature.properties?.id)
    console.log(`Geometry type:`, feature.geometry?.type)
    console.log(`Geometry coordinates:`, feature.geometry?.coordinates)
    
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0]
      console.log(`Polygon coordinates (first ring):`, coords)
      console.log(`Number of points:`, coords.length)
      
      if (!coords || coords.length === 0) {
        console.log(`❌ No coordinates found`)
        return null
      }
      
      const sumX = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0)
      const sumY = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0)
      const centroid = [sumX / coords.length, sumY / coords.length] as [number, number]
      
      console.log(`Sum X:`, sumX, `Sum Y:`, sumY)
      console.log(`Centroid:`, centroid)
      
      // Validate centroid
      if (isNaN(centroid[0]) || isNaN(centroid[1])) {
        console.log(`❌ Invalid centroid (NaN)`)
        return null
      }
      
      if (centroid[0] < -180 || centroid[0] > 180 || centroid[1] < -90 || centroid[1] > 90) {
        console.log(`❌ Centroid out of valid geographic range:`, centroid)
        return null
      }
      
      console.log(`✅ Valid centroid:`, centroid)
      return centroid
    }
    
    if (feature.geometry.type === 'MultiPolygon') {
      console.log(`Processing MultiPolygon with ${feature.geometry.coordinates.length} polygons`)
      
      let totalSumX = 0
      let totalSumY = 0
      let totalPoints = 0
      
      // Process each polygon in the MultiPolygon
      feature.geometry.coordinates.forEach((polygon: number[][][], polygonIndex: number) => {
        console.log(`Processing polygon ${polygonIndex + 1}/${feature.geometry.coordinates.length}`)
        
        const coords = polygon[0] // First ring of the polygon
        console.log(`Polygon ${polygonIndex + 1} coordinates:`, coords)
        console.log(`Polygon ${polygonIndex + 1} points:`, coords.length)
        
        if (coords && coords.length > 0) {
          const sumX = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0)
          const sumY = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0)
          
          totalSumX += sumX
          totalSumY += sumY
          totalPoints += coords.length
          
          console.log(`Polygon ${polygonIndex + 1} sum:`, { sumX, sumY, points: coords.length })
        }
      })
      
      if (totalPoints === 0) {
        console.log(`❌ No valid coordinates found in MultiPolygon`)
        return null
      }
      
      const centroid = [totalSumX / totalPoints, totalSumY / totalPoints] as [number, number]
      
      console.log(`MultiPolygon totals:`, { totalSumX, totalSumY, totalPoints })
      console.log(`MultiPolygon centroid:`, centroid)
      
      // Validate centroid
      if (isNaN(centroid[0]) || isNaN(centroid[1])) {
        console.log(`❌ Invalid centroid (NaN)`)
        return null
      }
      
      if (centroid[0] < -180 || centroid[0] > 180 || centroid[1] < -90 || centroid[1] > 90) {
        console.log(`❌ Centroid out of valid geographic range:`, centroid)
        return null
      }
      
      console.log(`✅ Valid MultiPolygon centroid:`, centroid)
      return centroid
    }
    
    console.log(`❌ Unsupported geometry type:`, feature.geometry.type)
    return null
  }, [])

  const isPointInPolygon = useCallback((point: [number, number], polygon: [number, number][]): boolean => {
    let inside = false
    const [x, y] = point
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }, [])

  const getDistance = useCallback((point1: [number, number], point2: [number, number]): number => {
    const [lng1, lat1] = point1
    const [lng2, lat2] = point2
    
    // Use Haversine formula for geographic distance calculation
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }, [])

  // Helper function to convert pixel radius to geographic radius
  const convertRadiusToGeographic = useCallback((pixelRadius: number, center: [number, number]): number => {
    if (!map.current) return pixelRadius
    
    try {
      // Get the map's current zoom level
      const zoom = map.current.getZoom()
      
      // Calculate the geographic distance that corresponds to the pixel radius
      // At zoom level 0, 1 pixel ≈ 156543.03392 meters at the equator
      const metersPerPixel = 156543.03392 * Math.cos(center[1] * Math.PI / 180) / Math.pow(2, zoom)
      const geographicRadiusMeters = pixelRadius * metersPerPixel
      
      // Convert meters to degrees (approximate)
      // 1 degree of latitude ≈ 111,320 meters
      const geographicRadiusDegrees = geographicRadiusMeters / 111320
      
      console.log('Radius conversion:', {
        pixelRadius,
        zoom,
        metersPerPixel,
        geographicRadiusMeters,
        geographicRadiusDegrees
      })
      
      return geographicRadiusDegrees
    } catch (error) {
      console.error('Error converting radius:', error)
      return pixelRadius
    }
  }, [])

  const findFeaturesInPolygon = useCallback((polygon: number[][]): string[] => {
    if (!data || polygon.length < 3) return []

    const selectedFeatures: string[] = []
    const missedFeatures: string[] = []
    
    console.log(`=== POLYGON SELECTION DEBUG ===`)
    console.log(`Polygon coordinates:`, polygon)
    console.log(`Total features to check:`, data.features.length)
    
    data.features.forEach((feature: any, index: number) => {
      const featureId = feature.properties?.id
      console.log(`\n--- Feature ${index + 1}/${data.features.length}: ${featureId} ---`)
      
      if (!featureId) {
        console.log(`❌ No feature ID found`)
        return
      }
      
      const centroid = getFeatureCentroid(feature)
      console.log(`Centroid:`, centroid)
      
      if (!centroid) {
        console.log(`❌ No valid centroid`)
        missedFeatures.push(featureId)
        return
      }
      
      const isInside = isPointInPolygon(centroid, polygon as [number, number][])
      console.log(`Is inside polygon:`, isInside)
      
      if (isInside) {
        selectedFeatures.push(featureId)
        console.log(`✅ Added to selection`)
      } else {
        missedFeatures.push(featureId)
        console.log(`❌ Outside polygon`)
      }
    })
    
    console.log(`\n=== POLYGON SELECTION RESULTS ===`)
    console.log(`Selected:`, selectedFeatures)
    console.log(`Missed:`, missedFeatures)
    console.log(`Total selected: ${selectedFeatures.length}/${data.features.length}`)
    
    return selectedFeatures
  }, [data, getFeatureCentroid, isPointInPolygon])

  const findFeaturesInCircle = useCallback((center: [number, number], radiusDegrees: number): string[] => {
    if (!data) return []

    const selectedFeatures: string[] = []
    const missedFeatures: string[] = []
    
    console.log(`=== CIRCLE SELECTION DEBUG ===`)
    console.log(`Center:`, center)
    console.log(`Radius (degrees):`, radiusDegrees)
    console.log(`Total features to check:`, data.features.length)
    
    data.features.forEach((feature: any, index: number) => {
      const featureId = feature.properties?.id
      console.log(`\n--- Feature ${index + 1}/${data.features.length}: ${featureId} ---`)
      
      if (!featureId) {
        console.log(`❌ No feature ID found`)
        return
      }
      
      const centroid = getFeatureCentroid(feature)
      console.log(`Centroid:`, centroid)
      
      if (!centroid) {
        console.log(`❌ No valid centroid`)
        missedFeatures.push(featureId)
        return
      }
      
      // Use simple geographic distance calculation for degrees
      const [lng1, lat1] = center
      const [lng2, lat2] = centroid
      
      // Calculate distance in degrees (simplified but effective for small distances)
      const dLat = Math.abs(lat2 - lat1)
      const dLng = Math.abs(lng2 - lng1)
      
      // For small distances, we can use a simple approximation
      // This works well for the scale of German states
      const distance = Math.sqrt(dLat * dLat + dLng * dLng)
      
      console.log(`Distance: ${distance} degrees (radius: ${radiusDegrees})`)
      console.log(`Is within radius:`, distance <= radiusDegrees)
      
      if (distance <= radiusDegrees) {
        selectedFeatures.push(featureId)
        console.log(`✅ Added to selection`)
      } else {
        missedFeatures.push(featureId)
        console.log(`❌ Outside radius`)
      }
    })
    
    console.log(`\n=== CIRCLE SELECTION RESULTS ===`)
    console.log(`Selected:`, selectedFeatures)
    console.log(`Missed:`, missedFeatures)
    console.log(`Total selected: ${selectedFeatures.length}/${data.features.length}`)
    
    return selectedFeatures
  }, [data, getFeatureCentroid])

  // Integrate TerraDraw for advanced drawing capabilities
  const terraDrawRef = useRef<{ getSnapshot: () => any[]; clearAll: () => void } | null>(null)

  // Handle TerraDraw selection changes
  const handleTerraDrawSelection = useCallback((featureIds: (string | number)[]) => {
    console.log('handleTerraDrawSelection called with feature IDs:', featureIds)
    
    if (!featureIds || featureIds.length === 0) {
      console.log('No feature IDs provided from TerraDraw')
      return
    }

    const allDrawFeatures = terraDrawRef.current?.getSnapshot() ?? []
    console.log('All TerraDraw features:', allDrawFeatures)
    
    // Process ALL feature IDs, not just the last one
    const allSelectedFeatures: string[] = []
    
    featureIds.forEach((featureId, index) => {
      console.log(`Processing feature ID ${index + 1}/${featureIds.length}:`, featureId)
      
      const drawFeature = allDrawFeatures.find((f: any) => f.id === featureId)
      console.log('Found draw feature:', drawFeature)

      if (!drawFeature || !drawFeature.geometry) {
        console.log('No valid draw feature found for ID:', featureId)
        return
      }

      console.log('Draw feature geometry:', drawFeature.geometry)
      console.log('Draw feature geometry type:', drawFeature.geometry.type)
      console.log('Draw feature coordinates:', drawFeature.geometry.coordinates)

      if (drawFeature.geometry.type === 'Polygon' && Array.isArray(drawFeature.geometry.coordinates[0])) {
        console.log('Processing polygon selection')
        // Use the drawn polygon to select map features
        const polygon = drawFeature.geometry.coordinates[0] as [number, number][]
        console.log('Polygon coordinates:', polygon)
        console.log('Polygon length:', polygon.length)
        
        // Ensure polygon has at least 3 points
        if (polygon.length < 3) {
          console.log('Polygon has less than 3 points, skipping')
          return
        }
        
        // Ensure all coordinates are valid numbers
        const validPolygon = polygon.filter((coord): coord is [number, number] => 
          Array.isArray(coord) && coord.length === 2 && 
          typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
          !isNaN(coord[0]) && !isNaN(coord[1])
        )
        
        if (validPolygon.length < 3) {
          console.log('Valid polygon has less than 3 points, skipping')
          return
        }
        
        console.log('Valid polygon coordinates:', validPolygon)
        
        // Convert coordinates if needed (TerraDraw might use screen coordinates)
        const geographicPolygon = validPolygon.map(coord => {
          // If coordinates look like screen coordinates (large numbers), convert them
          if (coord[0] > 180 || coord[0] < -180 || coord[1] > 90 || coord[1] < -90) {
            // These might be screen coordinates, convert to geographic
            const point = map.current?.unproject(coord)
            return point ? [point.lng, point.lat] as [number, number] : coord
          }
          return coord
        })
        
        console.log('Geographic polygon coordinates:', geographicPolygon)
        
        const selectedFeatures = findFeaturesInPolygon(geographicPolygon)
        console.log('Selected features from polygon:', selectedFeatures)
        
        // Add to the collection instead of immediately adding to state
        allSelectedFeatures.push(...selectedFeatures)
        
      } else if (drawFeature.geometry.type === 'Point' && drawFeature.properties?.radius && drawFeature.geometry.coordinates) {
        console.log('Processing circle selection')
        // Use the drawn circle to select map features
        const center = drawFeature.geometry.coordinates as [number, number]
        const pixelRadius = drawFeature.properties.radius
        console.log('Circle center:', center, 'pixel radius:', pixelRadius)
        
        // Ensure center coordinates are valid
        if (!Array.isArray(center) || center.length !== 2 || 
            typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
            isNaN(center[0]) || isNaN(center[1])) {
          console.log('Invalid center coordinates:', center)
          return
        }
        
        // Convert coordinates if needed
        let geographicCenter = center
        if (center[0] > 180 || center[0] < -180 || center[1] > 90 || center[1] < -90) {
          // These might be screen coordinates, convert to geographic
          const point = map.current?.unproject(center)
          geographicCenter = point ? [point.lng, point.lat] as [number, number] : center
        }
        
        console.log('Geographic center:', geographicCenter)
        
        // Convert pixel radius to geographic radius
        const geographicRadius = convertRadiusToGeographic(pixelRadius, geographicCenter)
        console.log('Converted geographic radius:', geographicRadius)
        
        const selectedFeatures = findFeaturesInCircle(geographicCenter, geographicRadius)
        console.log('Selected features from circle:', selectedFeatures)
        
        // Add to the collection instead of immediately adding to state
        allSelectedFeatures.push(...selectedFeatures)
        
      } else {
        console.log('Unsupported geometry type:', drawFeature.geometry.type)
      }
    })
    
    // Remove duplicates and add all selected features to state
    const uniqueSelectedFeatures = [...new Set(allSelectedFeatures)]
    console.log('All unique selected features:', uniqueSelectedFeatures)
    
    if (uniqueSelectedFeatures.length > 0) {
      // Get current selected regions and merge with new selections
      const currentSelectedRegions = selectedRegions || []
      const mergedRegions = [...new Set([...currentSelectedRegions, ...uniqueSelectedFeatures])]
      console.log('Current selected regions:', currentSelectedRegions)
      console.log('Merged regions:', mergedRegions)
      
      // Set all regions at once to avoid race conditions
      setSelectedRegions(mergedRegions)
    } else {
      console.log('No features found in any selection')
    }
  }, [findFeaturesInPolygon, findFeaturesInCircle, selectedRegions, setSelectedRegions, convertRadiusToGeographic])

  // Actually call useTerraDraw and assign to ref
  const terraDrawApi = useTerraDraw({
    map: map.current,
    isEnabled: currentDrawingMode !== null && currentDrawingMode !== 'cursor' && isMapLoaded && styleLoaded,
    mode: currentDrawingMode !== 'cursor' ? currentDrawingMode : null,
    onSelectionChange: handleTerraDrawSelection,
  })
  terraDrawRef.current = terraDrawApi
  const { clearAll, getSnapshot } = terraDrawApi

  // Handle drawing mode changes
  const handleDrawingModeChange = useCallback((mode: TerraDrawMode | null) => {
    setCurrentDrawingMode(mode)
  }, [])

  // Handle search functionality
  const handleSearch = useCallback((query: string) => {
    // This will be passed from the parent component
    console.log('Search query:', query);
  }, [])

  // Initialize map - ONLY ONCE
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new (maplibregl as any).Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: center,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 18
    })

    map.current.on('load', () => {
      setIsMapLoaded(true)
    })

    map.current.on('style.load', () => {
      setStyleLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      setLayersLoaded(false)
    }
  }, []) // Empty dependency array - map is created only once

  // Update map center and zoom when props change (without recreating map)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    map.current.setCenter(center)
    map.current.setZoom(zoom)
  }, [center, zoom, isMapLoaded])

  // Create or update layers when data changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || !styleLoaded || !data) return

    const sourceId = `${layerId}-source`
    const mainLayerId = `${layerId}-layer`
    const hoverLayerId = `${layerId}-hover`
    const selectedLayerId = `${layerId}-selected`

    // Check if source already exists
    const existingSource = map.current.getSource(sourceId)
    
    if (existingSource) {
      // Update existing source data
      existingSource.setData(data)
    } else {
      // Create new source and layers
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: data
    })

    // Add main layer
    map.current.addLayer({
        id: mainLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
          'fill-color': '#627D98',
        'fill-opacity': 0.4,
          'fill-outline-color': '#102A43'
      }
    })

      // Add hover layer
    map.current.addLayer({
        id: hoverLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
          'fill-color': '#627D98',
          'fill-opacity': 0.6,
          'fill-outline-color': '#102A43'
        },
        layout: {
          visibility: 'none'
        }
    })

    // Add selected regions layer
    map.current.addLayer({
        id: selectedLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
          'fill-color': '#2563EB',
          'fill-opacity': 0.8,
          'fill-outline-color': '#1D4ED8'
      },
      filter: ['in', 'id', ...selectedRegions]
    })

      setLayersLoaded(true)
    }

  }, [data, layerId, isMapLoaded, styleLoaded])

  // Update selected regions filter only after layers are loaded
  useEffect(() => {
    if (!map.current || !layersLoaded) return
    
    const selectedLayerId = `${layerId}-selected`
    const layerExists = map.current.getLayer(selectedLayerId)
    
    if (layerExists) {
      map.current.setFilter(selectedLayerId, ['in', 'id', ...selectedRegions])
    }
  }, [selectedRegions, layerId, layersLoaded])

  // Stable click handler for cursor mode
  const handleClick = useCallback((e: any) => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor' || !e.features || e.features.length === 0) return

    const feature = e.features[0]
    const regionId = feature.properties?.id

    if (regionId) {
      if (selectedRegions.includes(regionId)) {
        removeSelectedRegion(regionId)
      } else {
        addSelectedRegion(regionId)
      }
    }
  }, [selectedRegions, addSelectedRegion, removeSelectedRegion, layersLoaded, currentDrawingMode])

  // Stable hover handlers for cursor mode
  const handleMouseMove = useCallback((e: any) => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return

    const hoverLayerId = `${layerId}-hover`
    
    if (e.features && e.features.length > 0) {
      const feature = e.features[0]
      const regionId = feature.properties?.id

      if (regionId) {
        map.current.setFilter(hoverLayerId, ['==', 'id', regionId])
        map.current.setLayoutProperty(hoverLayerId, 'visibility', 'visible')
        map.current.getCanvas().style.cursor = 'pointer'
      }
    } else {
      map.current.setLayoutProperty(hoverLayerId, 'visibility', 'none')
      map.current.getCanvas().style.cursor = ''
    }
  }, [layerId, layersLoaded, currentDrawingMode])

  const handleMouseLeave = useCallback(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return

    const hoverLayerId = `${layerId}-hover`
    map.current.getCanvas().style.cursor = ''
    map.current.setLayoutProperty(hoverLayerId, 'visibility', 'none')
  }, [layerId, layersLoaded, currentDrawingMode])

  // Add event listeners only for cursor mode
  useEffect(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return

    const mainLayerId = `${layerId}-layer`

    // Remove any existing listeners first
    map.current.off('click', mainLayerId, handleClick)
    map.current.off('mousemove', mainLayerId, handleMouseMove)
    map.current.off('mouseleave', mainLayerId, handleMouseLeave)

    // Add new listeners
    map.current.on('click', mainLayerId, handleClick)
    map.current.on('mousemove', mainLayerId, handleMouseMove)
    map.current.on('mouseleave', mainLayerId, handleMouseLeave)

    return () => {
      if (map.current) {
        map.current.off('click', mainLayerId, handleClick)
        map.current.off('mousemove', mainLayerId, handleMouseMove)
        map.current.off('mouseleave', mainLayerId, handleMouseLeave)
      }
    }
  }, [handleClick, handleMouseMove, handleMouseLeave, layerId, layersLoaded, currentDrawingMode])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {isDrawingToolsVisible && (
        <div className="absolute top-4 left-4 z-10">
          <DrawingTools
            currentMode={currentDrawingMode}
            onModeChange={handleDrawingModeChange}
            onClearAll={clearAll}
            onToggleVisibility={() => setIsDrawingToolsVisible(false)}
            isVisible={isDrawingToolsVisible}
            onSearch={handleSearch}
          />
        </div>
      )}
      
      {!isDrawingToolsVisible && (
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setIsDrawingToolsVisible(true)}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50"
            title="Show Map Tools"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
} 