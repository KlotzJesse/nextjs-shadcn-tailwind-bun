import {
  setMapLanguage,
  type SupportedLanguage,
} from "@/lib/utils/map-style-utils";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";

/**
 * Hook that automatically sets the map language when the map is loaded
 * Only runs once per map instance to avoid unnecessary updates
 * @param mapRef Reference to the MapLibre map instance
 * @param isMapLoaded Whether the map has finished loading
 * @param language The language code to set (defaults to 'de' for German)
 */
export function useMapLanguage(
  mapRef: React.RefObject<MapLibreMap | null>,
  isMapLoaded: boolean,
  language: SupportedLanguage = "de"
) {
  // Track if we've already set the language for this map instance
  const hasSetLanguage = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // If we've already set the language for this map instance, don't do it again
    if (hasSetLanguage.current === mapRef.current) return;

    // Set language after a short delay to ensure all layers are loaded
    const timer = setTimeout(() => {
      if (mapRef.current && hasSetLanguage.current !== mapRef.current) {
        setMapLanguage(mapRef.current, language);
        hasSetLanguage.current = mapRef.current;

        if (process.env.NODE_ENV === "development") {
          console.log(`Map language set to ${language} on initial load`);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mapRef, isMapLoaded, language]);

  // Reset the tracking when map instance changes (component unmount/remount)
  useEffect(() => {
    if (!mapRef.current) {
      hasSetLanguage.current = null;
    }
  }, [mapRef]);
}
