import type { Map as MapLibre } from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import {
  GeoJSONStoreFeatures,
  TerraDraw,
  TerraDrawAngledRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSectorMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

// Define all available drawing modes
export type TerraDrawMode =
  | "cursor" // Cursor selection (not a TerraDraw mode, but our custom mode)
  | "freehand" // Lasso selection
  | "circle" // Radius selection
  | "polygon" // Regular polygon
  | "point" // Single point
  | "linestring" // Line/path
  | "rectangle" // Rectangle
  | "angled-rectangle"; // Angled rectangle

// Props for useTerraDraw hook
export type UseTerraDrawProps = {
  map: MapLibre | null;
  isEnabled: boolean;
  mode: TerraDrawMode | null;
  onSelectionChange?: (features: (string | number)[]) => void;
  // onFeatureCreate?: (feature: { id: string | number }) => void;
  // onFeatureUpdate?: (feature: { id: string | number }) => void;
  // onFeatureDelete?: (featureId: string | number) => void;
  // onModeChange?: (mode: TerraDrawMode) => void;
  onStart?: () => void;
  onStop?: () => void;
};

// Invariant: All hooks must always be called, and dependency arrays must be stable.
// This hook must always be called unconditionally in the component tree, even if map is not ready (pass null).
export function useTerraDraw({
  map,
  isEnabled,
  mode,
  onSelectionChange,
  // onFeatureCreate,
  // onFeatureUpdate,
  // onFeatureDelete,
  // onModeChange,
  onStart,
  onStop,
}: UseTerraDrawProps) {
  const drawRef = useRef<TerraDraw | null>(null);
  const isInitializedRef = useRef(false);
  useEffect(() => {
    console.log(
      "[TerraDraw] useTerraDraw hook mounted. map:",
      map,
      "isEnabled:",
      isEnabled,
      "mode:",
      mode
    );
    return () => {
      console.log("[TerraDraw] useTerraDraw hook unmounted.");
    };

  }, [map, isEnabled, mode]);

  // Only initialize TerraDraw once, after map style is loaded
  useEffect(() => {
    if (!map || isInitializedRef.current) return;
    let styleLoadHandler: (() => void) | null = null;
    const initialize = () => {
      try {
        const draw = new TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map }),
          modes: [
            new TerraDrawFreehandMode(),
            new TerraDrawCircleMode(),
            new TerraDrawPolygonMode(),
            new TerraDrawPointMode(),
            new TerraDrawLineStringMode(),
            new TerraDrawRectangleMode(),
            new TerraDrawAngledRectangleMode(),
            new TerraDrawSectorMode(),
            new TerraDrawSelectMode(),
          ],
        });
        draw.on(
          "finish",
          (_id: string | number, context: { action: string; mode: string }) => {
            try {
              if (context.action === "draw") {
                const allFeatures = draw.getSnapshot();
                const featureIds = allFeatures.map((feature) => feature.id);
                if (featureIds.length > 0) {
                  onSelectionChange?.(
                    featureIds.filter((id) => id !== undefined && id !== null)
                  );
                }
              }
            } catch (error) {
              console.error("[TerraDraw] Error in finish event:", error);
            }
          }
        );
        drawRef.current = draw;
        isInitializedRef.current = true;
        console.log("[TerraDraw] TerraDraw initialized successfully");
      } catch (error) {
        console.error("[TerraDraw] Failed to initialize TerraDraw:", error);
        isInitializedRef.current = false;
      }
    };
    if (map.isStyleLoaded()) {
      initialize();
    } else {
      styleLoadHandler = () => {
        map.off("style.load", styleLoadHandler!);
        if (!isInitializedRef.current) {
          initialize();
        }
      };
      map.on("style.load", styleLoadHandler);
    }
    // Cleanup: remove style.load listener if unmounting
    return () => {
      if (map && styleLoadHandler) map.off("style.load", styleLoadHandler);
    };
  }, [map, onSelectionChange]);

  const clearAll = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.clear();
    } catch (error) {
      console.error("Failed to clear drawings:", error);
    }
  }, []);

  const getSnapshot = useCallback(() => {
    if (!drawRef.current) return [];
    return drawRef.current.getSnapshot();
  }, []);

  const addFeatures = useCallback((features: GeoJSONStoreFeatures[]) => {
    if (!drawRef.current) return [];
    return drawRef.current.addFeatures(features);
  }, []);

  const removeFeatures = useCallback((featureIds: string[]) => {
    if (!drawRef.current) return;
    drawRef.current.removeFeatures(featureIds);
  }, []);

  const selectFeature = useCallback((featureId: string) => {
    if (!drawRef.current) return;
    drawRef.current.selectFeature(featureId);
  }, []);

  const deselectFeature = useCallback((featureId: string) => {
    if (!drawRef.current) return;
    drawRef.current.deselectFeature(featureId);
  }, []);

  const getModeState = useCallback(() => {
    if (!drawRef.current) return null;
    return drawRef.current.getModeState();
  }, []);

  // Initialize TerraDraw when map is ready
  useEffect(() => {
    if (map && !isInitializedRef.current) {
      // No-op: removed old initializeTerraDraw references
    }
  }, [map, onSelectionChange]);

  // Handle mode changes
  useEffect(() => {
    if (!drawRef.current) return;
    // If drawing mode is enabled and not cursor, start TerraDraw and set mode
    if (isEnabled && mode && mode !== "cursor") {
      try {
        drawRef.current.start();
        drawRef.current.setMode(mode);
        onStart?.();
      } catch (error) {
        console.error("[TerraDraw] Failed to start drawing:", error);
      }
    } else {
      // If switching to cursor mode or disabling, stop TerraDraw
      try {
        drawRef.current.stop();
        onStop?.();
      } catch (error) {
        console.error("[TerraDraw] Failed to stop drawing:", error);
      }
    }
  }, [isEnabled, mode, onStart, onStop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drawRef.current) {
        try {
          drawRef.current.stop();
          drawRef.current.clear();
        } catch (error) {
          console.error("Error during TerraDraw cleanup:", error);
        }
      }
    };
  }, []);

  return {
    isInitialized: isInitializedRef.current,
    clearAll,
    getSnapshot,
    addFeatures,
    removeFeatures,
    selectFeature,
    deselectFeature,
    getModeState,
  };
}
