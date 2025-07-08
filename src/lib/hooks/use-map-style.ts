import { useMapState } from "@/lib/url-state/map-state";
import { useEffect } from "react";

import type { MapboxMap } from "@/lib/types/mapbox";

interface MapStyleProps {
  map: MapboxMap | null;
  isMapLoaded: boolean;
  granularity: string;
}

export function useMapStyle({ map, isMapLoaded, granularity }: MapStyleProps) {
  const { selectedRegions } = useMapState()

  useEffect(() => {
    if (!map || !isMapLoaded) return

    const mainLayerId = `${granularity}-layer`
    const hoverLayerId = `${granularity}-hover`

    // Wait for layers to be available
    const checkLayers = () => {
      if (!map.getLayer(mainLayerId) || !map.getLayer(hoverLayerId)) {
        return false
      }
      return true
    }

    // If layers don't exist yet, wait for them
    if (!checkLayers()) {
      const styleLoadHandler = () => {
        if (checkLayers()) {
          applyStyles()
          map.off('style.load', styleLoadHandler)
        }
      }
      map.on('style.load', styleLoadHandler)
      return () => {
        map.off('style.load', styleLoadHandler)
      }
    }

    // Apply styles if layers exist
    const applyStyles = () => {
      try {
        // Update main layer style
        map.setPaintProperty(mainLayerId, "fill-color", "#627D98")
        map.setPaintProperty(mainLayerId, "fill-opacity", 0.4)
        map.setPaintProperty(mainLayerId, "fill-outline-color", "#102A43")
        map.setPaintProperty(mainLayerId, "fill-outline-width", 1)

        // Update hover layer style
        map.setPaintProperty(hoverLayerId, "fill-color", "#627D98")
        map.setPaintProperty(hoverLayerId, "fill-opacity", 0.6)
        map.setPaintProperty(hoverLayerId, "fill-outline-color", "#102A43")
        map.setPaintProperty(hoverLayerId, "fill-outline-width", 2)

        // Ensure layers are visible
        map.setLayoutProperty(mainLayerId, "visibility", "visible")
        map.setLayoutProperty(hoverLayerId, "visibility", "visible")
      } catch (error) {
        console.warn('Error applying map styles:', error)
      }
    }

    applyStyles()
  }, [map, isMapLoaded, granularity, selectedRegions])
}