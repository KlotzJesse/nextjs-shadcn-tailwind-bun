"use client"

import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"
import { useTerraDraw, TerraDrawMode } from "@/lib/hooks/use-terradraw"
import { DrawingTools } from "./drawing-tools"
import type { Feature, FeatureCollection, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson'
import { emptyFeatureCollection, featureCollectionFromIds, getLargestPolygonCentroid, makeLabelPoints } from '@/lib/utils/map-data'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ui/alert'

interface BaseMapProps {
  data: MapData
  layerId: string
  onSearch?: (query: string) => void
  center?: [number, number]
  zoom?: number
  statesData?: MapData | null
  granularity?: string
  onGranularityChange?: (granularity: string) => void
}

export function BaseMap({ 
  data, 
  layerId, 
  center = [10.4515, 51.1657], 
  zoom = 5,
  statesData,
  granularity,
  onGranularityChange
}: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const [layersLoaded, setLayersLoaded] = useState(false)
  const [currentDrawingMode, setCurrentDrawingMode] = useState<TerraDrawMode | null>(null)
  const [isDrawingToolsVisible, setIsDrawingToolsVisible] = useState(true)
  const { selectedRegions, addSelectedRegion, removeSelectedRegion, selectionMode, setSelectedRegions, setMapCenterZoom } = useMapState()

  // Track hovered regionId for hover source
  const hoveredRegionIdRef = useRef<string | null>(null)
  // Throttle timer for hover
  const hoverThrottleTimeout = useRef<NodeJS.Timeout | null>(null)
  const pendingHoverEvent = useRef<any>(null)

  // Helper functions for feature selection
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
      
      const centroid = getLargestPolygonCentroid(feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>)
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
  }, [data, isPointInPolygon])

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
      
      const centroid = getLargestPolygonCentroid(feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>)
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
  }, [data, isPointInPolygon])

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
    mode: currentDrawingMode !== null && currentDrawingMode !== 'cursor' ? currentDrawingMode : null,
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

  // Log data on first render
  console.log('Map data on render:', data)

  // Initialize map - ONLY ONCE, and only if data and container are ready
  useEffect(() => {
    if (!mapContainer.current) {
      console.warn('Map container ref not ready')
      return
    }
    if (!data || !data.features || data.features.length === 0) {
      console.error('Map data missing or empty on first load:', data)
      return
    }
    if (map.current) return

    console.log('Initializing map with data:', data)
    let isMounted = true
    import('maplibre-gl').then((maplibregl) => {
      if (!isMounted) return
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
    })
    return () => {
      isMounted = false
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      setLayersLoaded(false)
    }
  }, [mapContainer.current, data]) // Depend on container and data

  // Create or update layers when data changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || !styleLoaded || !data) return

    const sourceId = `${layerId}-source`
    const mainLayerId = `${layerId}-layer`
    const hoverSourceId = `${layerId}-hover-source`
    const hoverLayerId = `${layerId}-hover-layer`
    const selectedSourceId = `${layerId}-selected-source`
    const selectedLayerId = `${layerId}-selected-layer`
    const stateSourceId = 'state-boundaries-source'
    const stateLayerId = 'state-boundaries-layer'

    // --- Robust source creation ---
    // Always create all sources first
    if (!map.current.getSource(sourceId)) {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: data
      })
    } else {
      map.current.getSource(sourceId).setData(data)
    }
    if (!map.current.getSource(selectedSourceId)) {
      map.current.addSource(selectedSourceId, {
        type: 'geojson',
        data: emptyFeatureCollection()
      })
    }
    if (!map.current.getSource(hoverSourceId)) {
      map.current.addSource(hoverSourceId, {
        type: 'geojson',
        data: emptyFeatureCollection()
      })
    }
    const labelSourceId = `${layerId}-label-points`
    if (!map.current.getSource(labelSourceId)) {
      map.current.addSource(labelSourceId, {
        type: 'geojson',
        data: makeLabelPoints(data as FeatureCollection<Polygon | MultiPolygon>, 'PLZ')
      })
    } else {
      map.current.getSource(labelSourceId).setData(makeLabelPoints(data as FeatureCollection<Polygon | MultiPolygon>, 'PLZ'))
    }
    if (statesData) {
      if (!map.current.getSource(stateSourceId)) {
        map.current.addSource(stateSourceId, {
          type: 'geojson',
          data: statesData
        })
      } else {
        map.current.getSource(stateSourceId).setData(statesData)
      }
      if (!map.current.getSource('state-boundaries-label-points')) {
        map.current.addSource('state-boundaries-label-points', {
          type: 'geojson',
          data: makeLabelPoints(statesData as FeatureCollection<Polygon | MultiPolygon>, 'name')
        })
      } else {
        map.current.getSource('state-boundaries-label-points').setData(makeLabelPoints(statesData as FeatureCollection<Polygon | MultiPolygon>, 'name'))
      }
    }

    // --- Robust layer creation ---
    // Helper to add a layer with beforeId if it exists
    function safeAddLayer(layer: any, beforeId?: string) {
      try {
        if (beforeId && map.current.getLayer(beforeId)) {
          map.current.addLayer(layer, beforeId)
        } else {
          map.current.addLayer(layer)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Layer add failed:', layer.id, e)
      }
    }

    // 1. Postal code fill (bottom)
    if (!map.current.getLayer(mainLayerId)) {
      safeAddLayer({
        id: mainLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#627D98',
          'fill-opacity': 0.35,
          'fill-outline-color': '#102A43'
        }
      }, undefined)
    }
    // 2. State boundaries line (above fill)
    if (statesData && !map.current.getLayer(stateLayerId)) {
      safeAddLayer({
        id: stateLayerId,
        type: 'line',
        source: stateSourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'name'],
            'Baden-Württemberg', '#e57373',
            'Bayern', '#64b5f6',
            'Berlin', '#81c784',
            'Brandenburg', '#ffd54f',
            'Bremen', '#ba68c8',
            'Hamburg', '#4dd0e1',
            'Hessen', '#ffb74d',
            'Mecklenburg-Vorpommern', '#a1887f',
            'Niedersachsen', '#90a4ae',
            'Nordrhein-Westfalen', '#f06292',
            'Rheinland-Pfalz', '#9575cd',
            'Saarland', '#4caf50',
            'Sachsen', '#fbc02d',
            'Sachsen-Anhalt', '#388e3c',
            'Schleswig-Holstein', '#0288d1',
            'Thüringen', '#d84315',
            '#222' // default
          ],
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [6, 3]
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      }, mainLayerId)
    }
    // 3. Postal code border (above state boundaries line)
    if (!map.current.getLayer(`${layerId}-border`)) {
      safeAddLayer({
        id: `${layerId}-border`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#2563EB',
          'line-width': 0.7,
          'line-opacity': 0.3
        }
      }, statesData ? stateLayerId : mainLayerId)
    }
    // 4. Selected postal code fill (above all static fills/lines)
    if (!map.current.getLayer(selectedLayerId)) {
      safeAddLayer({
        id: selectedLayerId,
        type: 'fill',
        source: selectedSourceId,
        paint: {
          'fill-color': '#2563EB',
          'fill-opacity': 0.5,
          'fill-outline-color': '#1D4ED8'
        }
      }, `${layerId}-border`)
    }
    // 5. Hover line (above all static lines/fills)
    if (!map.current.getLayer(hoverLayerId)) {
      safeAddLayer({
        id: hoverLayerId,
        type: 'line',
        source: hoverSourceId,
        paint: {
          'line-color': '#2563EB',
          'line-width': 3,
        },
        layout: { visibility: 'none' },
        // @ts-ignore
        interactive: false // prevent this layer from blocking pointer events
      }, selectedLayerId)
    }
    // 6. State label (above all lines/fills)
    if (statesData && !map.current.getLayer('state-boundaries-label')) {
      safeAddLayer({
        id: 'state-boundaries-label',
        type: 'symbol',
        source: 'state-boundaries-label-points',
        layout: {
          'text-field': ['coalesce', ['get', 'name'], ['get', 'id'], ''],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 9,
          'text-anchor': 'center',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#222',
          'text-halo-color': '#fff',
          'text-halo-width': 2.5
        }
      }, hoverLayerId)
    }
    // 7. Postal code label (above all lines/fills but below state label)
    if (!map.current.getLayer(`${layerId}-label`)) {
      safeAddLayer({
        id: `${layerId}-label`,
        type: 'symbol',
        source: labelSourceId,
        layout: {
          'text-field': ['coalesce', ['get', 'PLZ'], ['get', 'plz'], ['get', 'id'], ''],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 9,
          'text-anchor': 'center',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#222',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      }, statesData ? 'state-boundaries-label' : hoverLayerId)
    }
    setLayersLoaded(true)
  }, [data, layerId, isMapLoaded, styleLoaded, statesData])

  // --- Update selected features source when selection changes ---
  useEffect(() => {
    if (!map.current || !layersLoaded) return
    const selectedSourceId = `${layerId}-selected-source`
    const src = map.current.getSource(selectedSourceId)
    if (src) {
      src.setData(featureCollectionFromIds(data, selectedRegions))
    }
  }, [selectedRegions, data, layerId, layersLoaded])

  // --- Hover handlers for cursor mode ---
  const processHover = useCallback((e: any) => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return
    const hoverSourceId = `${layerId}-hover-source`
    const hoverLayerId = `${layerId}-hover-layer`
    if (e.features && e.features.length > 0) {
      const feature = e.features[0]
      const regionId = feature.properties?.id
      if (regionId && hoveredRegionIdRef.current !== regionId) {
        // Set hover source to just this feature
        map.current.getSource(hoverSourceId).setData({
          type: 'FeatureCollection',
          features: [feature]
        })
        map.current.setLayoutProperty(hoverLayerId, 'visibility', 'visible')
        map.current.getCanvas().style.cursor = 'pointer'
        hoveredRegionIdRef.current = regionId
      }
    }
  }, [layerId, layersLoaded, currentDrawingMode])

  const handleMouseEnter = useCallback((e: any) => {
    processHover(e)
  }, [processHover])

  const handleMouseMove = useCallback((e: any) => {
    // Only update hover if regionId changes
    processHover(e)
  }, [processHover])

  const handleMouseLeave = useCallback(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return
    const hoverSourceId = `${layerId}-hover-source`
    const hoverLayerId = `${layerId}-hover-layer`
    map.current.getSource(hoverSourceId).setData(emptyFeatureCollection())
    map.current.setLayoutProperty(hoverLayerId, 'visibility', 'none')
    map.current.getCanvas().style.cursor = 'grab'
    hoveredRegionIdRef.current = null
  }, [layerId, layersLoaded, currentDrawingMode])

  // --- Click handler for cursor mode (selection) ---
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

  // --- Add event listeners only for cursor mode ---
  useEffect(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return
    const mainLayerId = `${layerId}-layer`
    const canvas = map.current.getCanvas()
    // Set initial cursor
    canvas.style.cursor = 'grab'
    // Dragging logic
    const handleMouseDown = () => { canvas.style.cursor = 'grabbing' }
    const handleMouseUp = () => { canvas.style.cursor = 'grab' }
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    // Remove old listeners
    map.current.off('mouseenter', mainLayerId, handleMouseEnter)
    map.current.off('mousemove', mainLayerId, handleMouseMove)
    map.current.off('mouseleave', mainLayerId, handleMouseLeave)
    map.current.off('click', mainLayerId, handleClick)
    // Add new listeners
    map.current.on('mouseenter', mainLayerId, handleMouseEnter)
    map.current.on('mousemove', mainLayerId, handleMouseMove)
    map.current.on('mouseleave', mainLayerId, handleMouseLeave)
    map.current.on('click', mainLayerId, handleClick)
    return () => {
      if (map.current) {
        map.current.off('mouseenter', mainLayerId, handleMouseEnter)
        map.current.off('mousemove', mainLayerId, handleMouseMove)
        map.current.off('mouseleave', mainLayerId, handleMouseLeave)
        map.current.off('click', mainLayerId, handleClick)
      }
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      if (hoverThrottleTimeout.current) {
        clearTimeout(hoverThrottleTimeout.current)
        hoverThrottleTimeout.current = null
      }
      pendingHoverEvent.current = null
      hoveredRegionIdRef.current = null
      // Always restore to default grab
      canvas.style.cursor = 'grab'
    }
  }, [handleMouseEnter, handleMouseMove, handleMouseLeave, handleClick, layerId, layersLoaded, currentDrawingMode])

  // Update map center and zoom when props change (without recreating map)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    const currentCenter = map.current.getCenter()
    const currentZoom = map.current.getZoom()
    // Only set center if different and valid
    if (
      Array.isArray(center) && center.length === 2 &&
      typeof center[0] === 'number' && typeof center[1] === 'number' &&
      (Math.abs(currentCenter.lng - center[0]) > 1e-6 ||
      Math.abs(currentCenter.lat - center[1]) > 1e-6)
    ) {
      map.current.setCenter({ lng: center[0], lat: center[1] })
    }
    // Only set zoom if different
    if (Math.abs(currentZoom - zoom) > 1e-6) {
      map.current.setZoom(zoom)
    }
  }, [center, zoom, isMapLoaded])

  // Persist map center and zoom in URL on user interaction
  useEffect(() => {
    if (!map.current || !isMapLoaded) return
    const handleMoveEnd = () => {
      const c = map.current.getCenter()
      setMapCenterZoom([c.lng, c.lat], map.current.getZoom())
    }
    const handleZoomEnd = () => {
      const c = map.current.getCenter()
      setMapCenterZoom([c.lng, c.lat], map.current.getZoom())
    }
    map.current.on('moveend', handleMoveEnd)
    map.current.on('zoomend', handleZoomEnd)
    return () => {
      if (map.current) {
        map.current.off('moveend', handleMoveEnd)
        map.current.off('zoomend', handleZoomEnd)
      }
    }
  }, [isMapLoaded, setMapCenterZoom])

  // Show error if data is missing or empty
  if (!data || !data.features || data.features.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] text-destructive">
        Map data is missing or empty. Please try reloading or select a different granularity.
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<Skeleton className="w-full h-full min-h-[400px] rounded-lg" />}>
        <div className="relative w-full h-full">
          <div 
            ref={mapContainer} 
            className="w-full h-full rounded-lg"
            style={{ minHeight: '400px' }}
            role="region"
            aria-label="Interactive Map"
          />
          {isDrawingToolsVisible && (
            <div className="absolute top-4 left-4 z-10" role="region" aria-label="Map Tools Panel">
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="w-56 h-80 rounded-lg" />}>
                  <DrawingTools
                    currentMode={currentDrawingMode}
                    onModeChange={handleDrawingModeChange}
                    onClearAll={clearAll}
                    onToggleVisibility={() => setIsDrawingToolsVisible(false)}
                    isVisible={isDrawingToolsVisible}
                    onSearch={handleSearch}
                    granularity={granularity}
                    onGranularityChange={onGranularityChange}
                    postalCodesData={data}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
          {!isDrawingToolsVisible && (
            <div className="absolute top-4 left-4 z-10" role="region" aria-label="Map Tools Panel">
              <button
                onClick={() => setIsDrawingToolsVisible(true)}
                className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                title="Show Map Tools"
                aria-label="Show Map Tools Panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  )
} 