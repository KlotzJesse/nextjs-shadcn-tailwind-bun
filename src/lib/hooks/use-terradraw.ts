
import { useCallback, useEffect, useRef } from 'react';

import type { MapboxMap } from '@/lib/types/mapbox';
import type { Feature } from 'geojson';

// Define all available drawing modes
export type TerraDrawMode =
  | 'cursor'        // Cursor selection (not a TerraDraw mode, but our custom mode)
  | 'freehand'      // Lasso selection
  | 'circle'        // Radius selection
  | 'polygon'       // Regular polygon
  | 'point'         // Single point
  | 'linestring'    // Line/path
  | 'rectangle'     // Rectangle
  | 'angled-rectangle' // Angled rectangle

// Props for useTerraDraw hook
export type UseTerraDrawProps = {
  map: MapboxMap | null;
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

  const initializeTerraDraw = useCallback(() => {
    if (!map || isInitializedRef.current) return;

    console.log('TerraDraw initialization started')
    console.log('Map exists:', !!map)
    console.log('Map style loaded:', map.isStyleLoaded())
    console.log('Map canvas exists:', !!map.getCanvas())

    // Wait for style to load before initializing TerraDraw
    if (!map.isStyleLoaded()) {
      console.log('Map style not loaded, waiting...')
      const onStyleLoad = () => {
        console.log('Map style loaded, proceeding with TerraDraw initialization')
        map.off('style.load', onStyleLoad);
        // Add a small delay to ensure map is fully ready
        setTimeout(() => {
          initializeTerraDraw();
        }, 200);
      };
      map.on('style.load', onStyleLoad);
      return;
    }

    // Additional check to ensure map is fully loaded and ready
    if (!map.getCanvas() || !map.getContainer()) {
      console.log('Map not fully ready, retrying...')
      setTimeout(() => {
        initializeTerraDraw();
      }, 200);
      return;
    }

    // Check if map has all required properties
    if (!map.getStyle() || !map.getCanvas().style) {
      console.log('Map style or canvas not ready, retrying...')
      setTimeout(() => {
        initializeTerraDraw();
      }, 200);
      return;
    }

    try {
      console.log('Initializing TerraDraw...')

      // Create TerraDraw with minimal configuration to avoid errors
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map
        }),
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

      console.log('TerraDraw created successfully')

      // Set up event listeners with defensive programming
      // Use 'finish' event instead of 'change' to trigger selection only after drawing is complete
      draw.on('finish', (id: string | number, context: { action: string, mode: string }) => {
        try {
          console.log('TerraDraw finish event received:', { id, context })

          if (context.action === 'draw') {
            console.log('Drawing finished, getting all features for selection')

            // Get all current features from TerraDraw
            const allFeatures = draw.getSnapshot()
            console.log('All TerraDraw features:', allFeatures)

            // Extract feature IDs for selection
            const featureIds = allFeatures.map((feature: { id: string | number }) => feature.id)
            console.log('Feature IDs for selection:', featureIds)

            // Only trigger selection if we have features
            if (featureIds.length > 0) {
              console.log('Triggering selection with feature IDs:', featureIds)
              onSelectionChange?.(featureIds)
            } else {
              console.log('No features found after drawing finish')
            }
          } else {
            console.log('Finish event was not a draw action:', context.action)
          }
        } catch (error) {
          console.error('Error in TerraDraw finish event:', error)
        }
      })

      // Keep change event for debugging but don't trigger selection
      draw.on('change', (ids: (string | number)[], type: string) => {
        console.log('TerraDraw change event received:', { ids, type })
        // Don't trigger selection here - only on finish
      })

      drawRef.current = draw;
      isInitializedRef.current = true;
      console.log('TerraDraw initialized successfully')
    } catch (error) {
      console.error('Failed to initialize TerraDraw:', error)
      // Reset initialization flag on error
      isInitializedRef.current = false;
    }
  }, [map, onSelectionChange]);

  const startDrawing = useCallback(() => {
    if (!drawRef.current || !mode) return;

    try {
      drawRef.current.start();
      drawRef.current.setMode(mode);
      onStart?.();
    } catch (error) {
      console.error('Failed to start drawing:', error);
    }
  }, [mode, onStart]);

  const stopDrawing = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.stop();
      onStop?.();
    } catch (error) {
      console.error('Failed to stop drawing:', error);
    }
  }, [onStop]);

  const clearAll = useCallback(() => {
    if (!drawRef.current) return;

    try {
      drawRef.current.clear();
    } catch (error) {
      console.error('Failed to clear drawings:', error);
    }
  }, []);

  const getSnapshot = useCallback(() => {
    if (!drawRef.current) return [];
    return drawRef.current.getSnapshot();
  }, []);

  const addFeatures = useCallback((features: Feature[]) => {
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
      initializeTerraDraw();
    }
  }, [map, initializeTerraDraw]);

  // Handle mode changes
  useEffect(() => {
    if (!drawRef.current) return;

    if (isEnabled && mode) {
      startDrawing();
    } else {
      stopDrawing();
    }
  }, [isEnabled, mode, startDrawing, stopDrawing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drawRef.current) {
        try {
          drawRef.current.stop();
          drawRef.current.clear();
        } catch (error) {
          console.error('Error during TerraDraw cleanup:', error);
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