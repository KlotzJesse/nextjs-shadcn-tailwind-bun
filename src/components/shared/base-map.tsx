"use client"
interface MinimalMap {
  getZoom(): number;
  unproject(coord: [number, number]): { lng: number; lat: number };
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  remove(): void;
  getSource(id: string): { setData(data: unknown): void } | undefined;
  addSource(id: string, source: unknown): void;
  setCenter(center: { lng: number; lat: number }): void;
  setZoom(zoom: number): void;
  getCenter(): { lng: number; lat: number };
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  setLayoutProperty(layerId: string, name: string, value: unknown): void;
  getCanvas(): { style: { cursor: string }, addEventListener: (...args: unknown[]) => void, removeEventListener: (...args: unknown[]) => void };
}


import { ErrorBoundary } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TerraDrawMode, useTerraDraw } from "@/lib/hooks/use-terradraw";
import type { MapData } from "@/lib/types/map-data";
import { useMapState } from "@/lib/url-state/map-state";
import { emptyFeatureCollection, featureCollectionFromIds, getLargestPolygonCentroid, makeLabelPoints } from '@/lib/utils/map-data';
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { DrawingTools } from "./drawing-tools";

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
  const map = useRef<MinimalMap | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const [layersLoaded, setLayersLoaded] = useState(false)
  const [currentDrawingMode, setCurrentDrawingMode] = useState<TerraDrawMode | null>(null)
  const [isDrawingToolsVisible, setIsDrawingToolsVisible] = useState(true)
  const { selectedRegions, addSelectedRegion, removeSelectedRegion, setSelectedRegions, setMapCenterZoom } = useMapState()

  // Track hovered regionId for hover source
  const hoveredRegionIdRef = useRef<string | null>(null)
  // Throttle timer for hover
  const hoverThrottleTimeout = useRef<NodeJS.Timeout | null>(null)
  const pendingHoverEvent = useRef<unknown>(null)

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

    data.features.forEach((feature, index: number) => {
      if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') return;
      const typedFeature = feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>;
      const featureId = feature.properties?.id
      console.log(`\n--- Feature ${index + 1}/${data.features.length}: ${featureId} ---`)

      if (!featureId) {
        console.log(`❌ No feature ID found`)
        return
      }

      const centroid = getLargestPolygonCentroid(typedFeature)
      console.log(`Centroid:`, centroid)

      if (!centroid) {
        console.log(`❌ No valid centroid`)
        missedFeatures.push(featureId)
        return
      }

      // Ensure centroid is a tuple [number, number]
      const isInside = Array.isArray(centroid) && centroid.length === 2 && typeof centroid[0] === 'number' && typeof centroid[1] === 'number'
        ? isPointInPolygon(centroid as [number, number], polygon as [number, number][])
        : false
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

    data.features.forEach((feature, index: number) => {
      if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') return;
      const typedFeature = feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>;
      const featureId = feature.properties?.id
      console.log(`\n--- Feature ${index + 1}/${data.features.length}: ${featureId} ---`)

      if (!featureId) {
        console.log(`❌ No feature ID found`)
        return
      }

      const centroid = getLargestPolygonCentroid(typedFeature)
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
  const terraDrawRef = useRef<{ getSnapshot: () => unknown[]; clearAll: () => void } | null>(null)

  // Handle TerraDraw selection changes
  const handleTerraDrawSelection = useCallback((featureIds: (string | number)[]) => {
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
      // Inline type guard for drawFeature
      const drawFeature = allDrawFeatures.find((f): f is { id: string | number; geometry?: Feature["geometry"]; properties?: GeoJsonProperties & { radius?: number } } => {
        return typeof f === 'object' && f !== null && 'id' in f && (f as { id?: string | number }).id === featureId;
      });
      if (!drawFeature) {
        console.log('No valid draw feature found for ID:', featureId)
        return;
      }
      if (drawFeature.geometry && drawFeature.geometry.type === 'Polygon' && Array.isArray(drawFeature.geometry.coordinates[0])) {
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
          return
        }
        // Convert coordinates if needed (TerraDraw might use screen coordinates)
        const geographicPolygon = validPolygon.map(coord => {
          if (coord[0] > 180 || coord[0] < -180 || coord[1] > 90 || coord[1] < -90) {
            const point = map.current?.unproject(coord)
            return point ? [point.lng, point.lat] as [number, number] : coord
          }
          return coord
        })
        const selectedFeatures = findFeaturesInPolygon(geographicPolygon)
        allSelectedFeatures.push(...selectedFeatures)
      } else if (
        drawFeature.geometry &&
        drawFeature.geometry.type === 'Point' &&
        drawFeature.properties?.radius &&
        drawFeature.geometry.coordinates
      ) {
        console.log('Processing circle selection')
        // Use the drawn circle to select map features
        const center = drawFeature.geometry.coordinates as [number, number]
        const pixelRadius = drawFeature.properties.radius
        console.log('Circle center:', center, 'pixel radius:', pixelRadius)
        // Ensure center coordinates are valid
        if (!Array.isArray(center) || center.length !== 2 ||
            typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
            isNaN(center[0]) || isNaN(center[1])) {
          return
        }
        // Convert coordinates if needed
        let geographicCenter = center
        if (center[0] > 180 || center[0] < -180 || center[1] > 90 || center[1] < -90) {
          const point = map.current?.unproject(center)
          geographicCenter = point ? [point.lng, point.lat] as [number, number] : center
        }
        const geographicRadius = convertRadiusToGeographic(pixelRadius, geographicCenter)
        const selectedFeatures = findFeaturesInCircle(geographicCenter, geographicRadius)
        allSelectedFeatures.push(...selectedFeatures)
      } else if (drawFeature.geometry) {
        console.log('Unsupported geometry type:', drawFeature.geometry.type)
      }
    });
    // Remove duplicates and add all selected features to state
    const uniqueSelectedFeatures = [...new Set(allSelectedFeatures)]
    if (uniqueSelectedFeatures.length > 0) {
      const currentSelectedRegions = selectedRegions || []
      const mergedRegions = [...new Set([...currentSelectedRegions, ...uniqueSelectedFeatures])]
      setSelectedRegions(mergedRegions)
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
  const { clearAll } = terraDrawApi

  // Handle drawing mode changes
  const handleDrawingModeChange = useCallback((mode: TerraDrawMode | null) => {
    setCurrentDrawingMode(mode)
  }, [])

  // Handle search functionality




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
      map.current = new (maplibregl as unknown as { Map: new (args: Record<string, unknown>) => MinimalMap }).Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: center,
        zoom: zoom,
        minZoom: 3,
        maxZoom: 18
      })
      if (map.current) {
        map.current.on('load', () => {
          setIsMapLoaded(true)
        })
        map.current.on('style.load', () => {
          setStyleLoaded(true)
        })
      }
    })
    return () => {
      isMounted = false
      if (map.current) {
      map.current?.remove()
        map.current = null
      }
      setLayersLoaded(false)
    }
  }, [mapContainer.current, data]) // Depend on container and data

  // Create or update layers when data changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || !styleLoaded || !data) return

    const sourceId = `${layerId}-source`
    // const mainLayerId = `${layerId}-layer`
    const hoverSourceId = `${layerId}-hover-source`
    const hoverLayerId = `${layerId}-hover-layer`
    const selectedSourceId = `${layerId}-selected-source`
    const selectedLayerId = `${layerId}-selected-layer`
    const stateSourceId = 'state-boundaries-source'
    const stateLayerId = 'state-boundaries-layer'

    // --- Robust source creation ---
    // Always create all sources first
    if (map.current && !map.current.getSource(sourceId)) {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: data
      })
    } else if (map.current) {
      const src = map.current.getSource(sourceId);
      if (src) src.setData(data);
    }
    if (map.current && !map.current.getSource(selectedSourceId)) {
      map.current.addSource(selectedSourceId, {
        type: 'geojson',
        data: emptyFeatureCollection()
      })
    }
    if (map.current && !map.current.getSource(hoverSourceId)) {
      map.current.addSource(hoverSourceId, {
        type: 'geojson',
        data: emptyFeatureCollection()
      })
    }
    const labelSourceId = `${layerId}-label-points`
    if (map.current && !map.current.getSource(labelSourceId)) {
      map.current.addSource(labelSourceId, {
        type: 'geojson',
        data: makeLabelPoints(data as FeatureCollection<Polygon | MultiPolygon>, 'PLZ')
      })
    } else if (map.current) {
      const src = map.current.getSource(labelSourceId);
      if (src) src.setData(makeLabelPoints(data as FeatureCollection<Polygon | MultiPolygon>, 'PLZ'));
    }
    if (statesData) {
      if (map.current && !map.current.getSource(stateSourceId)) {
        map.current.addSource(stateSourceId, {
          type: 'geojson',
          data: statesData
        })
      } else if (map.current) {
        const src = map.current.getSource(stateSourceId);
        if (src) src.setData(statesData);
      }
      if (map.current && !map.current.getSource('state-boundaries-label-points')) {
        map.current.addSource('state-boundaries-label-points', {
          type: 'geojson',
          data: makeLabelPoints(statesData as FeatureCollection<Polygon | MultiPolygon>, 'name')
        })
      } else if (map.current) {
        const src = map.current.getSource('state-boundaries-label-points');
        if (src) src.setData(makeLabelPoints(statesData as FeatureCollection<Polygon | MultiPolygon>, 'name'));
      }
    }

    // --- Robust layer creation ---
    // Helper to add a layer with beforeId if it exists
    function safeAddLayer(layer: Record<string, unknown>, beforeId?: string) {
      try {
        if (map.current && beforeId && map.current.getLayer(beforeId)) {
          map.current.addLayer(layer, beforeId)
        } else if (map.current) {
          map.current.addLayer(layer)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Layer add failed:', layer.id, e)
      }
    }

    // 1. Postal code fill (bottom)
    if (!map.current.getLayer(`${layerId}-layer`)) {
      safeAddLayer({
        id: `${layerId}-layer`,
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
      }, `${layerId}-layer`)
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
      }, statesData ? stateLayerId : `${layerId}-layer`)
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
  function isFeatureWithId(obj: unknown): obj is { properties?: { id?: string } } {
    return (
      typeof obj === 'object' && obj !== null &&
      'properties' in obj &&
      typeof (obj as { properties?: unknown }).properties === 'object' &&
      (obj as { properties?: unknown }).properties !== null &&
      'id' in (obj as { properties: { id?: unknown } }).properties
    );
  }

  const processHover = useCallback((...args: unknown[]) => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return;
    const hoverSourceId = `${layerId}-hover-source`;
    const hoverLayerId = `${layerId}-hover-layer`;
    const e = args[0] as { features?: unknown[] };
    if (e && Array.isArray(e.features) && e.features.length > 0) {
      const feature = e.features[0];
      if (isFeatureWithId(feature)) {
        const regionId = feature.properties?.id;
        if (regionId && hoveredRegionIdRef.current !== regionId) {
          const src = map.current?.getSource(hoverSourceId);
          if (src) {
            src.setData({
              type: 'FeatureCollection',
              features: [feature]
            });
          }
          map.current?.setLayoutProperty(hoverLayerId, 'visibility', 'visible');
          const canvas = map.current ? map.current.getCanvas() : null;
          if (canvas) canvas.style.cursor = 'pointer';
          hoveredRegionIdRef.current = regionId;
        }
      }
    }
  }, [layerId, layersLoaded, currentDrawingMode]);

  const handleMouseEnter = useCallback((...args: unknown[]) => {
    processHover(...args);
  }, [processHover]);

  const handleMouseMove = useCallback((...args: unknown[]) => {
    processHover(...args);
  }, [processHover]);

  const handleMouseLeave = useCallback(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return;
    const hoverSourceId = `${layerId}-hover-source`;
    const hoverLayerId = `${layerId}-hover-layer`;
    const src = map.current?.getSource(hoverSourceId);
    if (src) src.setData(emptyFeatureCollection());
    if (map.current) {
      map.current.setLayoutProperty(hoverLayerId, 'visibility', 'none');
      const canvas = map.current.getCanvas();
      if (canvas) canvas.style.cursor = 'grab';
    }
    hoveredRegionIdRef.current = null;
  }, [layerId, layersLoaded, currentDrawingMode]);

  // --- Click handler for cursor mode (selection) ---
  const handleClick = useCallback((...args: unknown[]) => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return;
    const e = args[0] as { features?: unknown[] };
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    if (isFeatureWithId(feature)) {
      const regionId = feature.properties?.id;
      if (regionId) {
        if (selectedRegions.includes(regionId)) {
          removeSelectedRegion(regionId);
        } else {
          addSelectedRegion(regionId);
        }
      }
    }
  }, [selectedRegions, addSelectedRegion, removeSelectedRegion, layersLoaded, currentDrawingMode]);

  // --- Add event listeners only for cursor mode ---
  useEffect(() => {
    if (!map.current || !layersLoaded || currentDrawingMode !== 'cursor') return
    const canvas = map.current.getCanvas()
    // Set initial cursor
    canvas.style.cursor = 'grab'
    // Dragging logic
    const handleMouseDown = () => { canvas.style.cursor = 'grabbing' }
    const handleMouseUp = () => { canvas.style.cursor = 'grab' }
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    // Remove old listeners
    if (map.current) {
      map.current.off('mouseenter', handleMouseEnter)
      map.current.off('mousemove', handleMouseMove)
      map.current.off('mouseleave', handleMouseLeave)
      map.current.off('click', handleClick)
    }
    // Add new listeners
    if (map.current) {
      map.current.on('mouseenter', handleMouseEnter)
      map.current.on('mousemove', handleMouseMove)
      map.current.on('mouseleave', handleMouseLeave)
      map.current.on('click', handleClick)
    }
    return () => {
      if (map.current) {
        map.current.off('mouseenter', handleMouseEnter)
        map.current.off('mousemove', handleMouseMove)
        map.current.off('mouseleave', handleMouseLeave)
        map.current.off('click', handleClick)
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
      if (map.current) {
        const c = map.current.getCenter()
        setMapCenterZoom([c.lng, c.lat], map.current.getZoom())
      }
    }
    const handleZoomEnd = () => {
      if (map.current) {
        const c = map.current.getCenter()
        setMapCenterZoom([c.lng, c.lat], map.current.getZoom())
      }
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

                    granularity={granularity}
                    onGranularityChange={onGranularityChange}
                    postalCodesData={data as unknown as FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>}
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