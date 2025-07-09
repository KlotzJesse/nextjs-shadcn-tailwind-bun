import { ErrorBoundary } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapBusinessLogic } from "@/lib/hooks/use-map-business-logic";
import { useMapCenterZoomSync } from "@/lib/hooks/use-map-center-zoom-sync";
import { useMapInitialization } from "@/lib/hooks/use-map-initialization";
import { useMapInteractions } from "@/lib/hooks/use-map-interactions";
import { useMapLayers } from "@/lib/hooks/use-map-layers";
import { useMapOptimizations } from "@/lib/hooks/use-map-optimizations";
import { useMapPerformanceMonitor } from "@/lib/hooks/use-map-performance-monitor";
import { useMapSelectedFeaturesSource } from "@/lib/hooks/use-map-selected-features-source";
import { useMapState } from "@/lib/url-state/map-state";
import type {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import { PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense, useMemo, useRef } from "react";
import { Button } from "../ui/button";

const DrawingTools = dynamic(
  () => import("./drawing-tools").then((m) => m.DrawingTools),
  { ssr: false }
);

interface BaseMapProps {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  layerId: string;
  onSearch?: (query: string) => void;
  center?: [number, number];
  zoom?: number;
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
}

export function BaseMap({
  data,
  layerId,
  center = [10.4515, 51.1657],
  zoom = 5,
  statesData,
  granularity,
  onGranularityChange,
}: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // Memoize map config for stable references
  const memoizedCenter = useMemo(() => center, [center]);
  const memoizedZoom = useMemo(() => zoom, [zoom]);
  const memoizedStyle = useMemo(
    () => "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    []
  );

  // Map initialization
  const { mapRef: map, isMapLoaded, styleLoaded } = useMapInitialization({
    mapContainer,
    data,
    center: memoizedCenter,
    zoom: memoizedZoom,
    style: memoizedStyle,
  });

  // URL state management
  const {
    selectedRegions,
    addSelectedRegion,
    removeSelectedRegion,
    setSelectedRegions,
    setMapCenterZoom,
  } = useMapState();

  // Performance optimizations with memoized computations
  const {
    getSelectedFeatureCollection,
    getLabelPoints,
    featureCount,
    selectedCount,
  } = useMapOptimizations({
    data,
    selectedRegions,
    statesData,
  });

  // Business logic and validation rules
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    // Note: These are available for future use and debugging
    // layerIds, sourceIds, selectionStats, validateFeature, validateCoordinates,
    // isGeographicCoordinate, polygonRequirements, selectionLimits
  } = useMapBusinessLogic({
    data,
    selectedRegions,
    layerId,
  });

  // Initialize hoveredRegionIdRef for layer setup
  const tempHoveredRegionIdRef = useRef<string | null>(null);

  // Map layers management (needs to be before interactions)
  const { layersLoaded } = useMapLayers({
    map: map.current,
    isMapLoaded,
    styleLoaded,
    layerId,
    data,
    statesData,
    selectedRegions,
    hoveredRegionId: tempHoveredRegionIdRef.current,
    getSelectedFeatureCollection,
    getLabelPoints,
  });

  // Comprehensive map interactions (drawing tools, hover, click, TerraDraw)
  const {
    currentDrawingMode,
    isDrawingToolsVisible,
    handleDrawingModeChange,
    showTools,
    hideTools,
    clearAll,
    // Note: hoveredRegionIdRef available for future debugging
  } = useMapInteractions({
    mapRef: map,
    layerId,
    data,
    isMapLoaded,
    styleLoaded,
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
    featureCount,
    selectedCount,
    isMapLoaded,
    layersLoaded,
    currentDrawingMode,
    componentName: "BaseMap",
  });

  // Show error if data is missing or empty
  if (!data || !data.features || data.features.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] text-destructive">
        Map data is missing or empty. Please try reloading or select a different
        granularity.
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ minHeight: "400px" }}
        role="region"
        aria-label="Interactive Map"
      />
      {isDrawingToolsVisible && (
        <div
          className="absolute top-4 left-4 z-10"
          role="region"
          aria-label="Map Tools Panel"
        >
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="w-56 h-80 rounded-lg" />}>
              <DrawingTools
                currentMode={currentDrawingMode}
                onModeChange={handleDrawingModeChange}
                onClearAll={clearAll}
                onToggleVisibility={hideTools}
                granularity={granularity}
                onGranularityChange={onGranularityChange}
                postalCodesData={data}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {!isDrawingToolsVisible && (
        <div
          className="absolute top-4 left-4 z-10"
          role="region"
          aria-label="Map Tools Panel"
        >
          <Button
            variant="outline"
            onClick={showTools}
            title="Show Map Tools"
            aria-label="Show Map Tools Panel"
          >
            <PlusIcon width={24} height={24} />
          </Button>
        </div>
      )}
    </ErrorBoundary>
  );
}
