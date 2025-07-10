import { ErrorBoundary } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapCenterZoomSync } from "@/lib/hooks/use-map-center-zoom-sync";
import { useMapConfig } from "@/lib/hooks/use-map-config";
import { useMapDataValidation } from "@/lib/hooks/use-map-data-validation";
import { useMapInitialization } from "@/lib/hooks/use-map-initialization";
import { useMapInteractions } from "@/lib/hooks/use-map-interactions";
import { useMapLayers } from "@/lib/hooks/use-map-layers";
import { useMapOptimizations } from "@/lib/hooks/use-map-optimizations";
import { useMapPerformanceMonitor } from "@/lib/hooks/use-map-performance-monitor";
import { useMapSelectedFeaturesSource } from "@/lib/hooks/use-map-selected-features-source";
import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import { useMapState } from "@/lib/url-state/map-state";
import type {
  BaseMapProps,
  MapErrorMessageProps,
  ToggleButtonProps,
} from "@/types/base-map";
import { PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, startTransition, Suspense, useMemo, useRef } from "react";
import { Button } from "../ui/button";

// Memoized drawing tools component with lazy loading for performance
const DrawingTools = dynamic(
  () => import("./drawing-tools").then((m) => m.DrawingTools),
  {
    ssr: false,
    loading: () => <Skeleton className="w-56 h-80 rounded-lg" />
  }
);

// Memoized error message component to prevent re-renders
const MapErrorMessage = memo(({ message }: MapErrorMessageProps) => (
  <div className="flex items-center justify-center w-full h-full min-h-[400px] text-destructive">
    {message}
  </div>
));
MapErrorMessage.displayName = "MapErrorMessage";

// Memoized toggle button component to prevent re-renders
const ToggleButton = memo(({
  onClick,
  title,
  ariaLabel,
  children
}: ToggleButtonProps) => (
  <Button
    variant="outline"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel}
  >
    {children}
  </Button>
));
ToggleButton.displayName = "ToggleButton";

// Main BaseMap component with performance optimizations
const BaseMapComponent = ({
  data,
  layerId,
  center = [10.4515, 51.1657],
  zoom = 5,
  statesData,
  granularity,
  onGranularityChange,
}: BaseMapProps) => {
  // Stable ref for map container
  const mapContainer = useRef<HTMLDivElement>(null);

  // Stable map configuration using custom hook
  const mapConfig = useMapConfig(center, zoom);

  // Memoized data validation for early return
  const { isValid: isDataValid, errorMessage } = useMapDataValidation(data);

  // Map initialization with stable config
  const { mapRef: map, isMapLoaded } = useMapInitialization({
    mapContainer,
    data,
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    style: mapConfig.style,
  });

  // URL state management with stable destructuring
  const mapState = useMapState();
  const {
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion,
    setSelectedRegions,
    setMapCenterZoom,
  } = mapState;

  // Performance optimizations with memoized computations
  const optimizations = useMapOptimizations({
    data,
    selectedRegions,
    statesData,
  });

  // Business logic with stable references (available for future use)

  // Memoized hovered region ref to prevent layer re-initialization
  const hoveredRegionIdRef = useMemo(() => ({ current: null as string | null }), []);

  // Map layers management with stable dependencies
  const { layersLoaded } = useMapLayers({
    map: map.current,
    isMapLoaded,
    layerId,
    data,
    statesData,
    selectedRegions, // selectedRegions is now a stable array from useMapState
    hoveredRegionId: hoveredRegionIdRef.current,
    getSelectedFeatureCollection: optimizations.getSelectedFeatureCollection,
    getLabelPoints: optimizations.getLabelPoints,
  });

  // Map interactions with memoized callbacks
  const interactions = useMapInteractions({
    mapRef: map,
    layerId,
    data,
    isMapLoaded,
    layersLoaded,
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion,
    setSelectedRegions,
  });

  // Selected features source updates
  useMapSelectedFeaturesSource({
    map: map.current,
    layerId,
    data,
    selectedRegions,
    layersLoaded,
  });

  // Map center/zoom synchronization
  useMapCenterZoomSync({
    mapRef: map,
    isMapLoaded,
    center,
    zoom,
    setMapCenterZoom,
  });

  // Performance monitoring (development only)
  useMapPerformanceMonitor({
    featureCount: optimizations.featureCount,
    selectedCount: optimizations.selectedCount,
    isMapLoaded,
    layersLoaded,
    currentDrawingMode: interactions.currentDrawingMode,
    componentName: "BaseMap",
  });

  // Memoized toggle handlers with React 19 batching optimization
  const handleShowTools = useStableCallback(() => {
    startTransition(() => {
      interactions.showTools();
    });
  });

  const handleHideTools = useStableCallback(() => {
    startTransition(() => {
      interactions.hideTools();
    });
  });

  const handleClearAll = useStableCallback(() => {
    startTransition(() => {
      interactions.clearAll();
    });
  });

  // Early return with stable error message
  if (!isDataValid) {
    return (
      <MapErrorMessage
        message={errorMessage || "Unknown error occurred with map data."}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ minHeight: mapConfig.minHeight }}
        role="region"
        aria-label="Interactive Map"
      />
      {interactions.isDrawingToolsVisible && (
        <div
          className="absolute top-4 left-4 z-10"
          role="region"
          aria-label="Map Tools Panel"
        >
          <ErrorBoundary>
            <Suspense>
              <DrawingTools
                currentMode={interactions.currentDrawingMode}
                onModeChange={interactions.handleDrawingModeChange}
                onClearAll={handleClearAll}
                onToggleVisibility={handleHideTools}
                granularity={granularity}
                onGranularityChange={onGranularityChange}
                postalCodesData={data}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {!interactions.isDrawingToolsVisible && (
        <div
          className="absolute top-4 left-4 z-10"
          role="region"
          aria-label="Map Tools Panel"
        >
          <ToggleButton
            onClick={handleShowTools}
            title="Show Map Tools"
            ariaLabel="Show Map Tools Panel"
          >
            <PlusIcon width={24} height={24} />
          </ToggleButton>
        </div>
      )}
    </ErrorBoundary>
  );
};

// Memoized export with display name for debugging
export const BaseMap = memo(BaseMapComponent);
BaseMap.displayName = "BaseMap";
