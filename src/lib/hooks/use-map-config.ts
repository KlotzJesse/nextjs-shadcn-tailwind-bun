import type { MapConfig } from "@/types/base-map";
import { useMemo } from "react";

/**
 * Hook for creating stable map configuration object
 * Prevents unnecessary re-renders by memoizing config values
 */
export function useMapConfig(
  center: [number, number],
  zoom: number
): MapConfig {
  return useMemo(() => ({
    center,
    zoom,
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    minHeight: "400px",
  }), [center, zoom]);
}
