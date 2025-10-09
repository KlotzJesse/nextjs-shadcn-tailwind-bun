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
  const [granularity, setGranularity] = useQueryState("granularity");
  const [radius, setRadius] = useQueryState("radius");

  // Area and layer management
  const [areaId, setAreaId] = useQueryState("areaId", {
    shallow: false,
  });
  const [activeLayerId, setActiveLayerId] = useQueryState("activeLayerId", {
    shallow: false,
  });
  const [versionId, setVersionId] = useQueryState("versionId");

  // Parse area and layer IDs
  const parsedAreaId = useMemo(() => {
    return areaId ? parseInt(areaId, 10) : null;
  }, [areaId]);

  const parsedActiveLayerId = useMemo(() => {
    return activeLayerId ? parseInt(activeLayerId, 10) : null;
  }, [activeLayerId]);

  const parsedVersionId = useMemo(() => {
    return versionId ? parseInt(versionId, 10) : null;
  }, [versionId]);

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

  const setVersion = useStableCallback((id: number | null) => {
    setVersionId(id !== null ? id.toString() : null);
  });

  return {
    granularity: granularity || "1digit",
    center: mapView.center,
    zoom: mapView.zoom,
    radius: radius ? parseInt(radius, 10) : 10,
    areaId: parsedAreaId,
    activeLayerId: parsedActiveLayerId,
    versionId: parsedVersionId,
    setGranularity,
    setMapCenterZoom, // atomic
    setRadius: useStableCallback((radiusValue: number) =>
      setRadius(radiusValue.toString())
    ),
    setArea,
    setActiveLayer,
    setVersion,
  };
}
