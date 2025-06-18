"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"

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
  const { selectedRegions, addSelectedRegion, removeSelectedRegion } = useMapState()

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

  // Stable click handler
  const handleClick = useCallback((e: any) => {
    if (!map.current || !layersLoaded || !e.features || e.features.length === 0) return

    const feature = e.features[0]
    const regionId = feature.properties?.id

    if (regionId) {
      if (selectedRegions.includes(regionId)) {
        removeSelectedRegion(regionId)
      } else {
        addSelectedRegion(regionId)
      }
    }
  }, [selectedRegions, addSelectedRegion, removeSelectedRegion])

  // Stable hover handlers with minimal dependencies

  const handleMouseMove = useCallback((e: any) => {
    if (!map.current || !layersLoaded) return

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
  }, [layerId, layersLoaded])

  const handleMouseLeave = useCallback(() => {
    if (!map.current || !layersLoaded) return

    const hoverLayerId = `${layerId}-hover`
    map.current.getCanvas().style.cursor = ''
    map.current.setLayoutProperty(hoverLayerId, 'visibility', 'none')
  }, [layerId, layersLoaded])

  // Add event listeners only once after layers are loaded
  useEffect(() => {
    if (!map.current || !layersLoaded) return

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
  }, [handleClick, handleMouseMove, handleMouseLeave, layerId, layersLoaded])

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  )
} 