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

  // Debug logging for drawing mode changes - only log on actual mode changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useMapInteractions] Drawing mode state:", {
        currentDrawingMode,
        isCursorMode,
        isDrawingActive,
      });
    }
  }, [currentDrawingMode, isCursorMode, isDrawingActive]); // Only log when drawing mode actually changes

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
    isEnabled: isDrawingActive,
    mode: isDrawingActive ? currentDrawingMode : null,
    onSelectionChange: handleTerraDrawSelection,
  });

  // Always assign terraDrawRef for stability
  terraDrawRef.current = terraDrawApi;

  // Hover interaction management
  const {
    hoveredRegionIdRef,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  } = useMapHoverInteraction(mapRef.current, layerId, layersLoaded, isCursorMode);

  // Click interaction management
  const { handleClick } = useMapClickInteraction(
    mapRef.current,
    layersLoaded,
    isCursorMode,
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion
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
