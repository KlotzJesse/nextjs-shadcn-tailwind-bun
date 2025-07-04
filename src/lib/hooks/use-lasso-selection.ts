import { useEffect, useRef, useCallback } from "react";
import type { MapData } from "@/lib/types";
import { useMapState } from "@/lib/url-state/map-state";
import { getLargestPolygonCentroid } from "@/lib/utils/map-data";
import { Feature, Polygon, MultiPolygon, GeoJsonProperties } from "geojson";

interface MapInstance {
  on: (type: string, listener: (e: any) => void) => void;
  off: (type: string, listener: (e: any) => void) => void;
  addSource: (id: string, source: any) => void;
  removeSource: (id: string) => void;
  addLayer: (layer: any) => void;
  removeLayer: (id: string) => void;
  getSource: (id: string) => any;
  setFilter: (layerId: string, filter: any[]) => void;
  remove: () => void;
  getCanvas: () => HTMLCanvasElement;
  dragPan: { disable: () => void; enable: () => void };
  dragRotate: { disable: () => void; enable: () => void };
  scrollZoom: { disable: () => void; enable: () => void };
  doubleClickZoom: { disable: () => void; enable: () => void };
  touchZoomRotate: { disable: () => void; enable: () => void };
}

interface LassoSelectionProps {
  map: MapInstance | null;
  isMapLoaded: boolean;
  data: MapData;
  granularity: string;
  enabled: boolean;
}

export function useLassoSelection({
  map,
  isMapLoaded,
  data,
  granularity,
  enabled,
}: LassoSelectionProps) {
  const { addSelectedRegion, removeSelectedRegion } = useMapState();
  const isDrawing = useRef(false);
  const lassoPoints = useRef<[number, number][]>([]);

  useEffect(() => {
    if (!map || !isMapLoaded) return;

    const canvas = map.getCanvas();
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Disable map interactions when lasso mode is enabled
    if (enabled) {
      map.dragPan.disable();
      map.dragRotate.disable();
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
    } else {
      // Re-enable map interactions when lasso mode is disabled
      map.dragPan.enable();
      map.dragRotate.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!enabled) return;

      isDrawing.current = true;
      lassoPoints.current = [];

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      lassoPoints.current.push([x, y]);

      // Start drawing
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current || !enabled) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      lassoPoints.current.push([x, y]);

      // Continue drawing
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleMouseUp = () => {
      if (!isDrawing.current || !enabled) return;

      isDrawing.current = false;

      // Close the path
      if (lassoPoints.current.length > 2) {
        ctx.closePath();
        ctx.stroke();

        // Find features within the lasso area
        const selectedFeatures = findFeaturesInLasso();

        // Update selected regions
        selectedFeatures.forEach((featureId) => {
          addSelectedRegion(featureId);
        });
      }

      // Clear the drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lassoPoints.current = [];
    };

    const findFeaturesInLasso = (): string[] => {
      if (!data?.features) return [];

      const selectedFeatures: string[] = [];

      // Create bounding box for quick elimination
      const lassoCoords = lassoPoints.current;
      if (lassoCoords.length < 3) return [];

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const [x, y] of lassoCoords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      // Process features in chunks to prevent UI blocking
      const processChunk = (startIndex: number) => {
        const CHUNK_SIZE = 50;
        const endIndex = Math.min(
          startIndex + CHUNK_SIZE,
          data.features.length
        );

        for (let i = startIndex; i < endIndex; i++) {
          const feature = data.features[i];
          const featureId =
            feature.properties?.id ||
            feature.properties?.PLZ ||
            feature.properties?.plz;
          if (!featureId) continue;

          // Get centroid using cached calculation
          const centroid = getFeatureCentroid(feature);
          if (!centroid) continue;

          // Quick bounding box check first
          const [cx, cy] = centroid;
          if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;

          // Only do expensive point-in-polygon test if within bounding box
          if (isPointInLasso(centroid)) {
            selectedFeatures.push(featureId);
          }
        }

        // Continue processing remaining chunks asynchronously
        if (endIndex < data.features.length) {
          setTimeout(() => processChunk(endIndex), 0);
        }
      };

      processChunk(0);
      return selectedFeatures;
    };

    // Cache for centroid calculations to avoid recomputation
    const centroidCache = new Map<string, [number, number] | null>();

    const getFeatureCentroid = (feature: any): [number, number] | null => {
      const featureId =
        feature.properties?.id ||
        feature.properties?.PLZ ||
        feature.properties?.plz;
      if (!featureId) return null;

      // Check cache first
      if (centroidCache.has(featureId)) {
        return centroidCache.get(featureId)!;
      }

      let result: [number, number] | null = null;

      // Simple centroid calculation - in a real app, use a proper geometry library
      if (feature.geometry.type === "Polygon") {
        const coords = feature.geometry.coordinates[0];
        if (coords && coords.length > 0) {
          const sumX = coords.reduce(
            (sum: number, coord: number[]) => sum + coord[0],
            0
          );
          const sumY = coords.reduce(
            (sum: number, coord: number[]) => sum + coord[1],
            0
          );
          result = [sumX / coords.length, sumY / coords.length];
        }
      } else if (feature.geometry.type === "MultiPolygon") {
        // Use the first polygon's centroid for simplicity
        const coords = feature.geometry.coordinates[0]?.[0];
        if (coords && coords.length > 0) {
          const sumX = coords.reduce(
            (sum: number, coord: number[]) => sum + coord[0],
            0
          );
          const sumY = coords.reduce(
            (sum: number, coord: number[]) => sum + coord[1],
            0
          );
          result = [sumX / coords.length, sumY / coords.length];
        }
      }

      // Cache the result
      centroidCache.set(featureId, result);
      return result;
    };

    const isPointInLasso = (point: [number, number]): boolean => {
      // Simple point-in-polygon test using ray casting
      if (lassoPoints.current.length < 3) return false;

      let inside = false;
      const [x, y] = point;

      for (
        let i = 0, j = lassoPoints.current.length - 1;
        i < lassoPoints.current.length;
        j = i++
      ) {
        const [xi, yi] = lassoPoints.current[i];
        const [xj, yj] = lassoPoints.current[j];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    };

    // Add event listeners only when enabled
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      // Cleanup event listeners
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);

      // Re-enable map interactions on cleanup
      map.dragPan.enable();
      map.dragRotate.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();

      // Clear any remaining drawing
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [
    map,
    isMapLoaded,
    data,
    granularity,
    enabled,
    addSelectedRegion,
    removeSelectedRegion,
  ]);
}
