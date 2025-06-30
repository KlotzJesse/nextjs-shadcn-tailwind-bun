import { useQueryState } from 'nuqs'

// Helper for atomic map view state
export function useMapView() {
  const [mapView, setMapViewRaw] = useQueryState('mapView')
  // mapView: { center: [lng, lat], zoom: number }
  const defaultView = { center: [10.4515, 51.1657], zoom: 5 }
  const parsed = mapView ? JSON.parse(mapView) : defaultView
  const setMapView = (view: { center: [number, number]; zoom: number }) => setMapViewRaw(JSON.stringify(view))
  return [
    parsed as { center: [number, number]; zoom: number },
    setMapView
  ] as const
}

// Hook for managing all map state
export function useMapState() {
  // --- Atomic map view state ---
  const [mapView, setMapView] = useMapView()
  // ---
  const [selectedRegions, setSelectedRegions] = useQueryState('selectedRegions')
  const [selectionMode, setSelectionMode] = useQueryState('selectionMode')
  const [granularity, setGranularity] = useQueryState('granularity')
  const [radius, setRadius] = useQueryState('radius')

  // Helper functions for managing selected regions
  const addSelectedRegion = (region: string) => {
    const current = selectedRegions ? JSON.parse(selectedRegions) : []
    if (!current.includes(region)) {
      setSelectedRegions(JSON.stringify([...current, region]))
    }
  }

  const removeSelectedRegion = (region: string) => {
    const current = selectedRegions ? JSON.parse(selectedRegions) : []
    setSelectedRegions(JSON.stringify(current.filter((r: string) => r !== region)))
  }

  const clearSelectedRegions = () => {
    setSelectedRegions(null)
  }

  const setSelectedRegionsArray = (regions: string[]) => {
    setSelectedRegions(JSON.stringify(regions))
  }

  // --- Atomic map view helpers ---
  const setMapCenterZoom = (center: [number, number], zoom: number) => {
    setMapView({ center, zoom })
  }

  return {
    // State
    selectedRegions: selectedRegions ? JSON.parse(selectedRegions) : [],
    selectionMode: selectionMode || 'cursor',
    granularity: granularity || 'plz-5stellig',
    center: mapView.center,
    zoom: mapView.zoom,
    radius: radius ? parseInt(radius, 10) : 10,
    // Setters
    setSelectedRegions: setSelectedRegionsArray,
    setSelectionMode,
    setGranularity,
    setMapCenterZoom, // atomic
    setRadius: (radiusValue: number) => setRadius(radiusValue.toString()),
    // Helper functions
    addSelectedRegion,
    removeSelectedRegion,
    clearSelectedRegions,
  }
}

// Individual hooks for specific state (deprecated for center/zoom)
export function useSelectedRegions() {
  const [selectedRegions, setSelectedRegions] = useQueryState('selectedRegions')
  return [
    selectedRegions ? JSON.parse(selectedRegions) : [],
    (regions: string[]) => setSelectedRegions(JSON.stringify(regions))
  ] as const
}

export function useSelectionMode() {
  return useQueryState('selectionMode')
}

export function useGranularity() {
  return useQueryState('granularity')
}

// Deprecated: use useMapState().center/zoom instead
export function useMapCenter() {
  const [mapView] = useMapView()
  return [mapView.center, () => {}] as const
}
export function useMapZoom() {
  const [mapView] = useMapView()
  return [mapView.zoom, () => {}] as const
}

export function useRadius() {
  const [radius, setRadius] = useQueryState('radius')
  return [
    radius ? parseInt(radius, 10) : 10,
    (radiusValue: number) => setRadius(radiusValue.toString())
  ] as const
} 