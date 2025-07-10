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

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    const timeSinceMount = now - mountTime.current;

    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[${componentName}] Render #${renderCount.current}`,
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

      // Warn about frequent re-renders
      if (timeSinceLastRender < 100 && renderCount.current > 5) {
        console.warn(
          `[${componentName}] Frequent re-renders detected! Time since last render: ${timeSinceLastRender}ms`
        );
      }
    }

    lastRenderTime.current = now;
  });

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
