import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import type { Map as MapLibre } from "maplibre-gl";
import { RefObject, useEffect, useRef } from "react";
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
  mapRef: RefObject<MapLibre | null>; // Changed from map to mapRef
  isMapLoaded: boolean; // Added for better control
  isEnabled: boolean;
  mode: TerraDrawMode | null;
  onSelectionChange?: (features: (string | number)[]) => void;
  onStart?: () => void;
  onStop?: () => void;
};

// Invariant: All hooks must always be called, and dependency arrays must be stable.
// This hook must always be called unconditionally in the component tree, even if map is not ready (pass null).
export function useTerraDraw({
  mapRef,
  isMapLoaded,
  isEnabled,
  mode,
  onSelectionChange,
  onStart,
  onStop,
}: UseTerraDrawProps) {
  const drawRef = useRef<TerraDraw | null>(null);
  const isInitializedRef = useRef(false);

  // Stable callbacks to prevent unnecessary re-initializations
  const stableOnSelectionChange = useStableCallback(
    (features: (string | number)[]) => {
      onSelectionChange?.(features);
    }
  );

  const stableOnStart = useStableCallback(() => {
    onStart?.();
  });

  const stableOnStop = useStableCallback(() => {
    onStop?.();
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || isInitializedRef.current) return;

    try {
      // Create adapter with explicit configuration
      const adapter = new TerraDrawMapLibreGLAdapter({
        map,
      });

      const draw = new TerraDraw({
        adapter,
        modes: [
          new TerraDrawSelectMode(),
          new TerraDrawFreehandMode({
            pointerDistance: 40,
            minDistance: 10,
          }),
          new TerraDrawCircleMode(),
          new TerraDrawPolygonMode({
            pointerDistance: 40,
          }),
          new TerraDrawPointMode(),
          new TerraDrawLineStringMode({
            pointerDistance: 40,
          }),
          new TerraDrawRectangleMode(),
          new TerraDrawAngledRectangleMode(),
          new TerraDrawSectorMode(),
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
                stableOnSelectionChange(
                  featureIds.filter((id) => id !== undefined && id !== null)
                );
              }
            }
          } catch (error) {
            console.error("[TerraDraw] Error in finish event:", error);
          }
        }
      );

      draw.start();
      draw.setMode("select");

      drawRef.current = draw;
      isInitializedRef.current = true;
    } catch (error) {
      console.error("[TerraDraw] Failed to initialize TerraDraw:", error);
      isInitializedRef.current = false;
    }
  }, [mapRef, isMapLoaded, stableOnSelectionChange]); // Include stableOnSelectionChange since it's used in the effect

  const clearAll = useStableCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.clear();
    } catch (error) {
      console.error("Failed to clear drawings:", error);
    }
  });

  const getSnapshot = useStableCallback(() => {
    if (!drawRef.current) return [];
    return drawRef.current.getSnapshot();
  });

  const addFeatures = useStableCallback((features: GeoJSONStoreFeatures[]) => {
    if (!drawRef.current) return [];
    return drawRef.current.addFeatures(features);
  });

  const removeFeatures = useStableCallback((featureIds: string[]) => {
    if (!drawRef.current) return;
    drawRef.current.removeFeatures(featureIds);
  });

  const selectFeature = useStableCallback((featureId: string) => {
    if (!drawRef.current) return;
    drawRef.current.selectFeature(featureId);
  });

  const deselectFeature = useStableCallback((featureId: string) => {
    if (!drawRef.current) return;
    drawRef.current.deselectFeature(featureId);
  });

  const getModeState = useStableCallback(() => {
    if (!drawRef.current) return null;
    return drawRef.current.getModeState();
  });

  // Handle mode changes with stable callbacks
  useEffect(() => {
    const map = mapRef.current;

    if (!drawRef.current || !isInitializedRef.current || !map) {
      return;
    }

    try {
      // Check if TerraDraw is started
      let isStarted = false;
      try {
        const currentModeState = drawRef.current.getModeState();
        isStarted = !!currentModeState;
      } catch {
        isStarted = false;
      }

      // Ensure TerraDraw is started
      if (!isStarted) {
        drawRef.current.start();
        drawRef.current.setMode("select");
      }

      // Now handle mode switching
      if (isEnabled && mode && mode !== "cursor") {
        // Disable map interactions BEFORE setting mode

        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();
        map.keyboard.disable();
        map.getContainer().style.cursor = "crosshair";

        // Set the drawing mode

        drawRef.current.setMode(mode);

        // Force a repaint to ensure events are properly attached
        //map.triggerRepaint();

        stableOnStart();
      } else {
        // Set to select mode
        drawRef.current.setMode("select");

        // Re-enable map interactions

        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.doubleClickZoom.enable();
        map.keyboard.enable();
        map.getContainer().style.cursor = "";

        stableOnStop();
      }
    } catch (error) {
      console.error("[TerraDraw] Error in mode change:", error);
    }
  }, [isEnabled, mode, stableOnStart, stableOnStop, mapRef]); // Use stable callbacks

  // Cleanup on unmount
  useEffect(() => {
    const currentMap = mapRef.current; // Capture the current map instance
    return () => {
      if (drawRef.current && currentMap) {
        try {
          drawRef.current.stop();
          drawRef.current.clear();
          // Re-enable all map interactions
          currentMap.dragPan.enable();
          currentMap.scrollZoom.enable();
          currentMap.boxZoom.enable();
          currentMap.doubleClickZoom.enable();
          currentMap.keyboard.enable();
          currentMap.getContainer().style.cursor = "";
        } catch (cleanupError) {
          console.error("Error during TerraDraw cleanup:", cleanupError);
        }
      }
    };
  }, [mapRef]); // Include mapRef dependency for cleanup

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
