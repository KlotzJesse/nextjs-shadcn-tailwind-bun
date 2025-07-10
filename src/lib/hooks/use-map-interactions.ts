import { useMapClickInteraction } from "@/lib/hooks/use-map-click-interaction";
import { useMapDrawingTools } from "@/lib/hooks/use-map-drawing-tools";
import { useMapEventListeners } from "@/lib/hooks/use-map-event-listeners";
import { useMapHoverInteraction } from "@/lib/hooks/use-map-hover-interaction";
import { useMapTerraDrawSelection } from "@/lib/hooks/use-map-terradraw-selection";
import { useTerraDraw } from "@/lib/hooks/use-terradraw";
import type { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { RefObject, useEffect } from "react";

interface UseMapInteractionsProps {
  mapRef: RefObject<MapLibreMap | null>;
  layerId: string;
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  isMapLoaded: boolean;
  styleLoaded: boolean;
  layersLoaded: boolean;
  selectedRegions: string[];
  addSelectedRegion: (regionId: string) => void;
  removeSelectedRegion: (regionId: string) => void;
  setSelectedRegions: (regions: string[]) => void;
}

/**
 * Comprehensive hook for managing all map interactions
 * Combines drawing tools, hover, click, and TerraDraw functionality
 * Optimized for React 19 with minimal re-renders and maximum performance
 */
export function useMapInteractions({
  mapRef,
  layerId,
  data,
  isMapLoaded,
  styleLoaded,
  layersLoaded,
  selectedRegions,
  addSelectedRegion,
  removeSelectedRegion,
  setSelectedRegions,
}: UseMapInteractionsProps) {
  // Drawing tools state management
  const {
    currentDrawingMode,
    isDrawingToolsVisible,
    isCursorMode,
    isDrawingActive,
    handleDrawingModeChange,
    toggleToolsVisibility,
    showTools,
    hideTools,
  } = useMapDrawingTools();

  // Debug logging for drawing mode changes - only log on mode changes, not map state changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useMapInteractions] Drawing mode state:", {
        currentDrawingMode,
        isCursorMode,
        isDrawingActive,
        isMapLoaded,
        styleLoaded,
      });
    }
  }, [currentDrawingMode, isCursorMode, isDrawingActive]); // Removed layersLoaded, isMapLoaded, styleLoaded to prevent unnecessary rerenders

  // TerraDraw selection logic
  const { terraDrawRef, handleTerraDrawSelection, clearAll } = useMapTerraDrawSelection({
    mapRef,
    data,
    selectedRegions,
    setSelectedRegions,
  });

  // TerraDraw integration - initialize as soon as map is ready, don't wait for layers
  // CRITICAL: Pass the ref directly to avoid unstable map references that cause constant remounting
  const terraDrawApi = useTerraDraw({
    mapRef, // Pass the ref, let useTerraDraw handle the dereferencing
    isMapLoaded,
    styleLoaded,
    isEnabled: isDrawingActive,
    mode: isDrawingActive ? currentDrawingMode : null,
    onSelectionChange: handleTerraDrawSelection,
  });

  // Debug logging for TerraDraw parameters - only log when TerraDraw relevant state changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const map = mapRef.current;
      console.log("[useMapInteractions] TerraDraw parameters:", {
        map: !!map,
        isMapLoaded,
        styleLoaded,
        mapReady: !!(map && isMapLoaded && styleLoaded),
        isEnabled: isDrawingActive,
        mode: isDrawingActive ? currentDrawingMode : null,
        currentDrawingMode,
        isDrawingActive,
      });
    }
  }, [isMapLoaded, styleLoaded, isDrawingActive, currentDrawingMode]); // Removed layersLoaded and mapRef to prevent unnecessary rerenders

  // Always assign terraDrawRef for stability
  terraDrawRef.current = terraDrawApi;

  // Hover interaction management
  const {
    hoveredRegionIdRef,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    isFeatureWithCode,
  } = useMapHoverInteraction(mapRef.current, layerId, layersLoaded, isCursorMode);

  // Click interaction management
  const { handleClick } = useMapClickInteraction(
    mapRef.current,
    layersLoaded,
    isCursorMode,
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion,
    isFeatureWithCode
  );

  // Event listeners management
  useMapEventListeners({
    map: mapRef.current,
    layerId,
    layersLoaded,
    isCursorMode,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
  });

  return {
    // Drawing tools state
    currentDrawingMode,
    isDrawingToolsVisible,
    isCursorMode,
    isDrawingActive,

    // Drawing tools actions
    handleDrawingModeChange,
    toggleToolsVisibility,
    showTools,
    hideTools,
    clearAll,

    // Hover state
    hoveredRegionIdRef,

    // TerraDraw API reference
    terraDrawRef,
  } as const;
}
