import type { TerraDrawMode } from "@/lib/hooks/use-terradraw";
import { useCallback, useState } from "react";

/**
 * Hook for managing drawing tools state and visibility
 * Optimized for React 19 with minimal re-renders
 */
export function useMapDrawingTools() {
  const [currentDrawingMode, setCurrentDrawingMode] = useState<TerraDrawMode | null>(null);
  const [isDrawingToolsVisible, setIsDrawingToolsVisible] = useState(true);

  // Memoized handlers to prevent unnecessary re-renders
  const handleDrawingModeChange = useCallback((mode: TerraDrawMode | null) => {
    console.log("[useMapDrawingTools] Drawing mode changed:", mode);
    setCurrentDrawingMode(mode);
  }, []);

  const toggleToolsVisibility = useCallback(() => {
    setIsDrawingToolsVisible((prev) => !prev);
  }, []);

  const showTools = useCallback(() => {
    setIsDrawingToolsVisible(true);
  }, []);

  const hideTools = useCallback(() => {
    setIsDrawingToolsVisible(false);
  }, []);

  // Check if currently in cursor mode (for hover/click interactions)
  const isCursorMode = currentDrawingMode === "cursor" || currentDrawingMode === null;

  // Check if drawing tools are active (not cursor mode)
  const isDrawingActive = currentDrawingMode !== null && currentDrawingMode !== "cursor";

  return {
    // State
    currentDrawingMode,
    isDrawingToolsVisible,
    isCursorMode,
    isDrawingActive,

    // Actions
    handleDrawingModeChange,
    toggleToolsVisibility,
    showTools,
    hideTools,
  } as const;
}
