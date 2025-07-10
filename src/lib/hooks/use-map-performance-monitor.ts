import { useEffect, useRef } from "react";

interface UseMapPerformanceMonitorProps {
  featureCount: number;
  selectedCount: number;
  isMapLoaded: boolean;
  layersLoaded: boolean;
  currentDrawingMode: string | null;
  componentName?: string;
}

/**
 * Hook for monitoring map performance and re-render frequency
 * Only active in development mode for debugging
 * Provides insights into component performance patterns
 */
export function useMapPerformanceMonitor({
  featureCount,
  selectedCount,
  isMapLoaded,
  layersLoaded,
  currentDrawingMode,
  componentName = "MapComponent",
}: UseMapPerformanceMonitorProps) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());
  const previousState = useRef<{
    featureCount: number;
    selectedCount: number;
    isMapLoaded: boolean;
    layersLoaded: boolean;
    currentDrawingMode: string | null;
  }>({
    featureCount,
    selectedCount,
    isMapLoaded,
    layersLoaded,
    currentDrawingMode,
  });

  useEffect(() => {
    // Only increment render count and calculate timings
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    const timeSinceMount = now - mountTime.current;
    lastRenderTime.current = now;

    // Only log in development and track what changed
    if (process.env.NODE_ENV === "development") {
      // Detect what changed between renders
      const current = { featureCount, selectedCount, isMapLoaded, layersLoaded, currentDrawingMode };
      const changes: string[] = [];

      Object.keys(current).forEach(key => {
        const k = key as keyof typeof current;
        if (previousState.current[k] !== current[k]) {
          changes.push(`${key}: ${previousState.current[k]} → ${current[k]}`);
        }
      });

      const shouldLog = renderCount.current <= 6; // Log first 6 renders to capture the pattern

      if (shouldLog) {
        console.log(
          `[${componentName}] Render #${renderCount.current} ${changes.length > 0 ? `(Changes: ${changes.join(', ')})` : '(No prop changes)'}`,
          {
            timeSinceLastRender: `${timeSinceLastRender}ms`,
            timeSinceMount: `${timeSinceMount}ms`,
            featureCount,
            selectedCount,
            isMapLoaded,
            layersLoaded,
            currentDrawingMode,
          }
        );
      }

      // Update previous state
      previousState.current = { ...current };

      // Warn about frequent re-renders
      if (timeSinceLastRender < 100 && renderCount.current > 8) {
        console.warn(
          `[${componentName}] Frequent re-renders detected! Time since last render: ${timeSinceLastRender}ms`
        );
      }
    }
  }); // No dependency array to run on every render

  // Log mount/unmount in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[${componentName}] Component mounted`);
      return () => {
        console.log(`[${componentName}] Component unmounted after ${renderCount.current} renders`);
      };
    }
  }, [componentName]);

  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - mountTime.current,
  } as const;
}
