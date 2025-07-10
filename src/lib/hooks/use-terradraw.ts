import type { Map as MapLibre } from "maplibre-gl";
import { RefObject, useCallback, useEffect, useRef } from "react";
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
  styleLoaded: boolean; // Added for better control
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
  styleLoaded,
  isEnabled,
  mode,
  onSelectionChange,
  onStart,
  onStop,
}: UseTerraDrawProps) {
  const drawRef = useRef<TerraDraw | null>(null);
  const isInitializedRef = useRef(false);

  // Memoize the callback to prevent unnecessary re-initializations
  const stableOnSelectionChange = useCallback((features: (string | number)[]) => {
    onSelectionChange?.(features);
  }, [onSelectionChange]);

  useEffect(() => {
    const map = mapRef.current;
    console.log(
      "[TerraDraw] useTerraDraw hook mounted. map:",
      map,
      "isMapLoaded:",
      isMapLoaded,
      "styleLoaded:",
      styleLoaded,
      "isEnabled:",
      isEnabled,
      "mode:",
      mode
    );
    return () => {
      console.log("[TerraDraw] useTerraDraw hook unmounted.");
    };
  }, [mapRef, isMapLoaded, styleLoaded, isEnabled, mode]);  // Only initialize TerraDraw once, after map style is loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !styleLoaded || isInitializedRef.current) return;

    console.log("[TerraDraw] Initializing TerraDraw with ready map and style...");
    console.log("[TerraDraw] Map instance:", map);
    console.log("[TerraDraw] Map container:", map?.getContainer());
    console.log("[TerraDraw] React styleLoaded flag:", styleLoaded);
    console.log("[TerraDraw] Map isStyleLoaded():", map?.isStyleLoaded());

    try {
      // Create adapter with explicit configuration
      const adapter = new TerraDrawMapLibreGLAdapter({
        map,
      });
      console.log("[TerraDraw] Adapter created:", adapter);

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

      console.log("[TerraDraw] TerraDraw instance created:", draw);

      draw.on(
        "finish",
        (_id: string | number, context: { action: string; mode: string }) => {
          try {
            console.log("[TerraDraw] Finish event:", { _id, context });
            if (context.action === "draw") {
              const allFeatures = draw.getSnapshot();
              console.log("[TerraDraw] All features after draw:", allFeatures);
              const featureIds = allFeatures.map((feature) => feature.id);
              if (featureIds.length > 0) {
                console.log("[TerraDraw] Calling onSelectionChange with:", featureIds);
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

      // Add change event listener for debugging
      draw.on("change", (features: unknown[], type: string) => {
        console.log("[TerraDraw] Change event:", { features, type });
      });

      // Add ready event listener
      draw.on("ready", () => {
        console.log("[TerraDraw] TerraDraw is ready");
      });

      // Start TerraDraw immediately since we know map and style are ready
      console.log("[TerraDraw] Starting TerraDraw in select mode");
      draw.start();
      draw.setMode("select");
      console.log("[TerraDraw] TerraDraw started successfully");

      drawRef.current = draw;
      isInitializedRef.current = true;
      console.log("[TerraDraw] TerraDraw initialized and started successfully");
    } catch (error) {
      console.error("[TerraDraw] Failed to initialize TerraDraw:", error);
      isInitializedRef.current = false;
    }
  }, [mapRef, isMapLoaded, styleLoaded, stableOnSelectionChange]);

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

  // Debug function to test TerraDraw manually
  const debugTerraDraw = useCallback(() => {
    const map = mapRef.current;
    if (!drawRef.current || !map) {
      console.log("[TerraDraw] Debug: Not initialized");
      return;
    }

    console.log("[TerraDraw] Debug: Current state");
    console.log("- Mode:", drawRef.current.getModeState());
    console.log("- Features:", drawRef.current.getSnapshot());
    console.log("- Map interactions:", {
      dragPan: map.dragPan.isEnabled(),
      scrollZoom: map.scrollZoom.isEnabled(),
      boxZoom: map.boxZoom.isEnabled(),
    });

    // Try to manually set to freehand mode
    try {
      console.log("[TerraDraw] Debug: Manually setting to freehand");
      drawRef.current.setMode("freehand");
      console.log("[TerraDraw] Debug: Mode after manual set:", drawRef.current.getModeState());
    } catch (error) {
      console.error("[TerraDraw] Debug: Error setting mode:", error);
    }
  }, [mapRef]);

  // Expose debug function globally for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).debugTerraDraw = debugTerraDraw;
    }
  }, [debugTerraDraw]);

  // Handle mode changes
  useEffect(() => {
    const map = mapRef.current;
    console.log("[TerraDraw] Mode change effect triggered:", {
      drawRef: !!drawRef.current,
      isInitialized: isInitializedRef.current,
      isEnabled,
      mode,
      map: !!map
    });

    if (!drawRef.current || !isInitializedRef.current || !map) {
      console.log("[TerraDraw] Mode change skipped - not ready");
      return;
    }

    console.log("[TerraDraw] Processing mode change:", { isEnabled, mode });

    try {
      // Check if TerraDraw is started
      let isStarted = false;
      try {
        const currentModeState = drawRef.current.getModeState();
        isStarted = !!currentModeState;
        console.log("[TerraDraw] Current mode state:", currentModeState, "isStarted:", isStarted);
      } catch {
        console.log("[TerraDraw] Could not get mode state, assuming not started");
        isStarted = false;
      }

      // Ensure TerraDraw is started
      if (!isStarted) {
        console.log("[TerraDraw] Starting TerraDraw");
        drawRef.current.start();
        drawRef.current.setMode("select");
        console.log("[TerraDraw] TerraDraw started in select mode");
      }

      // Now handle mode switching
      if (isEnabled && mode && mode !== "cursor") {
        console.log("[TerraDraw] Enabling drawing mode:", mode);

        // Disable map interactions BEFORE setting mode
        console.log("[TerraDraw] Disabling map interactions");
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();
        map.keyboard.disable();
        map.getContainer().style.cursor = 'crosshair';

        // Set the drawing mode
        console.log("[TerraDraw] Setting mode to:", mode);
        drawRef.current.setMode(mode);

        // Verify the mode was set
        const newMode = drawRef.current.getModeState();
        console.log("[TerraDraw] Verified mode after set:", newMode);

        // Force a repaint to ensure events are properly attached
        map.triggerRepaint();

        onStart?.();
        console.log("[TerraDraw] Drawing mode enabled successfully");
      } else {
        console.log("[TerraDraw] Switching to select/cursor mode");

        // Set to select mode
        drawRef.current.setMode("select");
        console.log("[TerraDraw] Set to select mode");

        // Re-enable map interactions
        console.log("[TerraDraw] Re-enabling map interactions");
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.doubleClickZoom.enable();
        map.keyboard.enable();
        map.getContainer().style.cursor = '';

        onStop?.();
        console.log("[TerraDraw] Cursor mode enabled successfully");
      }
    } catch (error) {
      console.error("[TerraDraw] Error in mode change:", error);
    }
  }, [mapRef, isEnabled, mode, onStart, onStop]);

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
          currentMap.getContainer().style.cursor = '';
        } catch (cleanupError) {
          console.error("Error during TerraDraw cleanup:", cleanupError);
        }
      }
    };
  }, [mapRef]);

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
