import { useMapClickInteraction } from "@/lib/hooks/use-map-click-interaction";
import { useMapDrawingTools } from "@/lib/hooks/use-map-drawing-tools";
import { useMapEventListeners } from "@/lib/hooks/use-map-event-listeners";
import { useMapHoverInteraction } from "@/lib/hooks/use-map-hover-interaction";
import { useMapTerraDrawSelection } from "@/lib/hooks/use-map-terradraw-selection";
import { useTerraDraw } from "@/lib/hooks/use-terradraw";
import type { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";

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

  // Memoize map reference for stability - use the actual map instance, not the ref
  const map = mapRef.current;

  // TerraDraw selection logic
  const { terraDrawRef, handleTerraDrawSelection, clearAll } = useMapTerraDrawSelection({
    mapRef,
    data,
    selectedRegions,
    setSelectedRegions,
  });

  // TerraDraw integration
  const terraDrawApi = useTerraDraw({
    map: map && isMapLoaded && styleLoaded ? map : null,
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
    isFeatureWithCode,
  } = useMapHoverInteraction(map, layerId, layersLoaded, isCursorMode);

  // Click interaction management
  const { handleClick } = useMapClickInteraction(
    map,
    layersLoaded,
    isCursorMode,
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion,
    isFeatureWithCode
  );

  // Event listeners management
  useMapEventListeners({
    map,
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
