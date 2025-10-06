import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { useStableCallback } from "../hooks/use-stable-callback";

// Helper for atomic map view state
export function useMapView() {
  const [mapView, setMapViewRaw] = useQueryState("mapView");
  // mapView: { center: [lng, lat], zoom: number }
  const defaultView = { center: [10.4515, 51.1657], zoom: 5 };
  const parsed = mapView ? JSON.parse(mapView) : defaultView;
  const setMapView = (view: { center: [number, number]; zoom: number }) =>
    setMapViewRaw(JSON.stringify(view));
  return [
    parsed as { center: [number, number]; zoom: number },
    setMapView,
  ] as const;
}

// Hook for managing all map state (Optimized v4 - with area/layer support)
export function useMapState() {
  // --- Atomic map view state ---
  const [mapView, setMapView] = useMapView();
  // ---
  const [selectedRegions, setSelectedRegions] =
    useQueryState("selectedRegions");
  const [selectionMode, setSelectionMode] = useQueryState("selectionMode");
  const [granularity, setGranularity] = useQueryState("granularity");
  const [radius, setRadius] = useQueryState("radius");

  // New: Area and layer management
  const [areaId, setAreaId] = useQueryState("areaId");
  const [activeLayerId, setActiveLayerId] = useQueryState("activeLayerId");

  // Memoize selected regions to prevent unnecessary rerenders when the array content is the same
  const selectedRegionsArray = useMemo(() => {
    return selectedRegions ? JSON.parse(selectedRegions) : [];
  }, [selectedRegions]);

  // Parse area and layer IDs
  const parsedAreaId = useMemo(() => {
    return areaId ? parseInt(areaId, 10) : null;
  }, [areaId]);

  const parsedActiveLayerId = useMemo(() => {
    return activeLayerId ? parseInt(activeLayerId, 10) : null;
  }, [activeLayerId]);

  // Helper functions for managing selected regions - memoized to prevent unnecessary rerenders
  // Note: setSelectedRegions from useQueryState should be stable, so we only depend on selectedRegions
  const addSelectedRegion = useStableCallback((region: string) => {
    const current = selectedRegions ? JSON.parse(selectedRegions) : [];
    if (!current.includes(region)) {
      setSelectedRegions(JSON.stringify([...current, region]));
    }
  });

  const removeSelectedRegion = useStableCallback((region: string) => {
    const current = selectedRegions ? JSON.parse(selectedRegions) : [];
    setSelectedRegions(
      JSON.stringify(current.filter((r: string) => r !== region))
    );
  });

  const clearSelectedRegions = useStableCallback(() => {
    setSelectedRegions(null);
  });

  const setSelectedRegionsArray = useStableCallback((regions: string[]) => {
    setSelectedRegions(JSON.stringify(regions));
  });

  const addSelectedRegions = useStableCallback((newRegions: string[]) => {
    const current = selectedRegions ? JSON.parse(selectedRegions) : [];
    const merged = [
      ...current,
      ...newRegions.filter((region) => !current.includes(region)),
    ];
    setSelectedRegions(JSON.stringify(merged));
  });

  // --- Atomic map view helpers ---
  const setMapCenterZoom = useStableCallback(
    (center: [number, number], zoom: number) => {
      setMapView({ center, zoom });
    }
  );

  // Area/Layer helpers
  const setArea = useStableCallback((id: number | null) => {
    setAreaId(id !== null ? id.toString() : null);
  });

  const setActiveLayer = useStableCallback((id: number | null) => {
    setActiveLayerId(id !== null ? id.toString() : null);
  });

  return {
    // State
    selectedRegions: selectedRegionsArray,
    selectionMode: selectionMode || "cursor",
    granularity: granularity || "1digit",
    center: mapView.center,
    zoom: mapView.zoom,
    radius: radius ? parseInt(radius, 10) : 10,
    areaId: parsedAreaId,
    activeLayerId: parsedActiveLayerId,
    // Setters
    setSelectedRegions: setSelectedRegionsArray,
    setSelectionMode,
    setGranularity,
    setMapCenterZoom, // atomic
    setRadius: useStableCallback((radiusValue: number) =>
      setRadius(radiusValue.toString())
    ),
    setArea,
    setActiveLayer,
    // Helper functions
    addSelectedRegion,
    addSelectedRegions,
    removeSelectedRegion,
    clearSelectedRegions,
  };
}

// Individual hooks for specific state (deprecated for center/zoom)
export function useSelectedRegions() {
  const [selectedRegions, setSelectedRegions] =
    useQueryState("selectedRegions");
  return [
    selectedRegions ? JSON.parse(selectedRegions) : [],
    (regions: string[]) => setSelectedRegions(JSON.stringify(regions)),
  ] as const;
}

export function useSelectionMode() {
  return useQueryState("selectionMode");
}

export function useGranularity() {
  return useQueryState("granularity");
}

// Deprecated: use useMapState().center/zoom instead
export function useMapCenter() {
  const [mapView] = useMapView();
  return [mapView.center, () => {}] as const;
}
export function useMapZoom() {
  const [mapView] = useMapView();
  return [mapView.zoom, () => {}] as const;
}

export function useRadius() {
  const [radius, setRadius] = useQueryState("radius");
  return [
    radius ? parseInt(radius, 10) : 10,
    (radiusValue: number) => setRadius(radiusValue.toString()),
  ] as const;
}
