

import type { FeatureCollection } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { RefObject, useLayoutEffect, useRef, useState } from "react";

export function useMapInitialization({
  mapContainer,
  data,
  center,
  zoom,
  style
}: {
  mapContainer: RefObject<HTMLDivElement | null>;
  data: FeatureCollection;
  center: [number, number];
  zoom: number;
  style: string;
}) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Use useLayoutEffect for DOM container setup to ensure synchronous initialization
  // This prevents potential race conditions and ensures the map container is ready
  useLayoutEffect(() => {
    if (!mapContainer.current) return;
    if (!data || !data.features || data.features.length === 0) return;
    if (mapRef.current) return;

    (async () => {
      const maplibre = await import("maplibre-gl");
      mapRef.current = new maplibre.Map({
        container: mapContainer.current!,
        style,
        center,
        zoom,
        minZoom: 3,
        maxZoom: 18,
      });
      mapRef.current.on("load", () => setIsMapLoaded(true));
      mapRef.current.on("style.load", () => setStyleLoaded(true));
    })();
  }, [center, data, zoom, mapContainer, style]);

  return { mapRef, isMapLoaded, styleLoaded };
}
