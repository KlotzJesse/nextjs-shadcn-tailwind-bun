import {
  createStyleDataUri,
  getEnhancedPositronStyle,
} from "@/lib/utils/map-style-utils";
import type { MapConfig } from "@/types/base-map";
import { useEffect, useMemo, useState } from "react";

/**
 * Hook for creating enhanced map configuration with always-visible German city names
 * Fetches and modifies the CartoDB Positron style to show city names in German at all zoom levels
 */
export function useEnhancedMapConfig(
  center: [number, number],
  zoom: number
): MapConfig & { isStyleLoading: boolean; styleError: string | null } {
  const [enhancedStyle, setEnhancedStyle] = useState<string | null>(null);
  const [isStyleLoading, setIsStyleLoading] = useState(true);
  const [styleError, setStyleError] = useState<string | null>(null);

  // Fetch and enhance the style on component mount
  useEffect(() => {
    let isCancelled = false;

    const loadEnhancedStyle = async () => {
      try {
        setIsStyleLoading(true);
        setStyleError(null);

        const enhancedStyleSpec = await getEnhancedPositronStyle();

        if (!isCancelled) {
          const styleDataUri = createStyleDataUri(enhancedStyleSpec);
          setEnhancedStyle(styleDataUri);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load enhanced map style:", error);
          setStyleError(
            error instanceof Error ? error.message : "Unknown error"
          );
          // Fallback to original CartoDB style
          setEnhancedStyle(
            "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsStyleLoading(false);
        }
      }
    };

    loadEnhancedStyle();

    return () => {
      isCancelled = true;
    };
  }, []); // Empty dependency array - only load once

  // Memoize the config to prevent unnecessary re-renders
  return useMemo(
    () => ({
      center,
      zoom,
      style:
        enhancedStyle ||
        "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      minHeight: "400px",
      isStyleLoading,
      styleError,
    }),
    [center, zoom, enhancedStyle, isStyleLoading, styleError]
  );
}
