import { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson"
import type { Map as MapLibreMap } from "maplibre-gl"
import { useEffect, useState } from "react"

interface MapLayersProps {
  map: MapLibreMap | null
  isMapLoaded: boolean
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> | null
  granularity: string
  selectedRegions: string[]
}

export function useMapLayers({ map, isMapLoaded, data, granularity, selectedRegions }: MapLayersProps): boolean {
  const [layersInitialized, setLayersInitialized] = useState(false)

  useEffect(() => {
    if (!map || !isMapLoaded || !data) {
      setLayersInitialized(false)
      return
    }

    const mainLayerId = `${granularity}-layer`
    const hoverLayerId = `${granularity}-hover`
    const sourceId = `${granularity}-source`

    const initializeLayers = () => {
      try {
        // Remove existing layers and sources if they exist
        if (map.getLayer(mainLayerId)) {
          map.removeLayer(mainLayerId)
        }
        if (map.getLayer(hoverLayerId)) {
          map.removeLayer(hoverLayerId)
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId)
        }

        // Add source
        map.addSource(sourceId, {
          type: "geojson",
          data: data as FeatureCollection<Polygon | MultiPolygon>,
        })

        // Add main layer
        map.addLayer({
          id: mainLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#627D98",
            "fill-opacity": 0.4,
            "fill-outline-color": "#102A43",
          },
        })

        // Add hover effect layer
        map.addLayer({
          id: hoverLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#627D98",
            "fill-opacity": 0.6,
            "fill-outline-color": "#102A43",
          },
          filter: ["==", "id", ""],
        })

        // Add hover interaction
        map.on("mousemove", mainLayerId, (e) => {
          if (e.features && e.features.length > 0) {
            map.setFilter(hoverLayerId, ["==", "id", e.features[0].properties?.id])
          }
        })

        map.on("mouseleave", mainLayerId, () => {
          map.setFilter(hoverLayerId, ["==", "id", ""])
        })

        setLayersInitialized(true)
      } catch (error) {
        console.warn('Error initializing map layers:', error)
        setLayersInitialized(false)
      }
    }

    // Wait for style to be loaded before adding layers
    if (map.isStyleLoaded()) {
      initializeLayers()
    } else {
      const styleLoadHandler = () => {
        initializeLayers()
        map.off('style.load', styleLoadHandler)
      }
      map.on('style.load', styleLoadHandler)
    }

    return () => {
      try {
        if (map.getLayer(mainLayerId)) {
          map.removeLayer(mainLayerId)
        }
        if (map.getLayer(hoverLayerId)) {
          map.removeLayer(hoverLayerId)
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId)
        }
        setLayersInitialized(false)
      } catch (error) {
        console.warn('Error cleaning up map layers:', error)
      }
    }
  }, [map, isMapLoaded, data, granularity, selectedRegions])

  return layersInitialized
}