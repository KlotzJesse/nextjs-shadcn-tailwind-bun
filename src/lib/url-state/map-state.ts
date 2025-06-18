import { useQueryState } from 'nuqs'

// Hook for managing all map state
export function useMapState() {
  const [selectedRegions, setSelectedRegions] = useQueryState('selectedRegions')
  const [selectionMode, setSelectionMode] = useQueryState('selectionMode')
  const [granularity, setGranularity] = useQueryState('granularity')
  const [center, setCenter] = useQueryState('center')
  const [zoom, setZoom] = useQueryState('zoom')
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

  const setCenterArray = (centerCoords: [number, number]) => {
    setCenter(JSON.stringify(centerCoords))
  }

  const setZoomNumber = (zoomLevel: number) => {
    setZoom(zoomLevel.toString())
  }

  const setRadiusNumber = (radiusValue: number) => {
    setRadius(radiusValue.toString())
  }

  return {
    // State
    selectedRegions: selectedRegions ? JSON.parse(selectedRegions) : [],
    selectionMode: selectionMode || 'cursor',
    granularity: granularity || 'plz-5stellig',
    center: center ? JSON.parse(center) : [10.4515, 51.1657],
    zoom: zoom ? parseInt(zoom, 10) : 5,
    radius: radius ? parseInt(radius, 10) : 10,
    
    // Setters
    setSelectedRegions: setSelectedRegionsArray,
    setSelectionMode,
    setGranularity,
    setCenter: setCenterArray,
    setZoom: setZoomNumber,
    setRadius: setRadiusNumber,
    
    // Helper functions
    addSelectedRegion,
    removeSelectedRegion,
    clearSelectedRegions,
  }
}

// Individual hooks for specific state
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

export function useMapCenter() {
  const [center, setCenter] = useQueryState('center')
  
  return [
    center ? JSON.parse(center) : [10.4515, 51.1657],
    (centerCoords: [number, number]) => setCenter(JSON.stringify(centerCoords))
  ] as const
}

export function useMapZoom() {
  const [zoom, setZoom] = useQueryState('zoom')
  
  return [
    zoom ? parseInt(zoom, 10) : 5,
    (zoomLevel: number) => setZoom(zoomLevel.toString())
  ] as const
}

export function useRadius() {
  const [radius, setRadius] = useQueryState('radius')
  
  return [
    radius ? parseInt(radius, 10) : 10,
    (radiusValue: number) => setRadius(radiusValue.toString())
  ] as const
} 