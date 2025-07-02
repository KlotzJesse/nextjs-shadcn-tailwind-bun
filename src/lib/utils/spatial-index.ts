import { quadtree } from "d3-quadtree";
import booleanIntersects from "@turf/boolean-intersects";
import { Feature, Polygon, MultiPolygon } from "geojson";
import { getLargestPolygonCentroid } from "./map-data";

// Spatial index using R-tree-like structure for fast geometric queries
export class SpatialIndex {
  private quadTree: any;
  private featureMap: Map<string, any>;
  private boundsCache: Map<string, [number, number, number, number]>;

  constructor(features: any[]) {
    this.featureMap = new Map();
    this.boundsCache = new Map();

    // Prepare data for quadtree with bounding boxes
    const points = features
      .map((feature) => {
        const id = this.getFeatureId(feature);
        if (!id) return null;

        const bounds = this.getFeatureBounds(feature);
        if (!bounds) return null;

        this.featureMap.set(id, feature);
        this.boundsCache.set(id, bounds);

        const [minX, minY, maxX, maxY] = bounds;
        return {
          id,
          x: (minX + maxX) / 2, // centroid x
          y: (minY + maxY) / 2, // centroid y
          minX,
          minY,
          maxX,
          maxY,
          feature,
        };
      })
      .filter(Boolean);

    // Build quadtree for spatial indexing
    this.quadTree = quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(points);
  }

  private getFeatureId(feature: any): string | null {
    return (
      feature.properties?.id ||
      feature.properties?.PLZ ||
      feature.properties?.plz ||
      null
    );
  }

  private getFeatureBounds(
    feature: any
  ): [number, number, number, number] | null {
    const id = this.getFeatureId(feature);
    if (!id) return null;

    if (this.boundsCache.has(id)) {
      return this.boundsCache.get(id)!;
    }

    try {
      const coords = this.extractCoordinates(feature.geometry);
      if (coords.length === 0) return null;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      const bounds: [number, number, number, number] = [minX, minY, maxX, maxY];
      this.boundsCache.set(id, bounds);
      return bounds;
    } catch (error) {
      console.warn(`Error calculating bounds for feature ${id}:`, error);
      return null;
    }
  }

  private extractCoordinates(geometry: any): [number, number][] {
    if (geometry.type === "Polygon") {
      return geometry.coordinates[0] || [];
    } else if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.flatMap(
        (poly: number[][][]) => poly[0] || []
      );
    }
    return [];
  }

  // Find features that potentially intersect with bounds (fast bounding box check)
  findPotentialIntersections(bounds: [number, number, number, number]): any[] {
    const [minX, minY, maxX, maxY] = bounds;
    const candidates: any[] = [];

    this.quadTree.visit(
      (node: any, x1: number, y1: number, x2: number, y2: number) => {
        // Check if node's bounds intersect with query bounds
        if (x1 > maxX || x2 < minX || y1 > maxY || y2 < minY) {
          return true; // skip this subtree
        }

        // If this is a leaf node, check each point
        if (!node.length) {
          do {
            const point = node.data;
            if (
              point &&
              point.minX <= maxX &&
              point.maxX >= minX &&
              point.minY <= maxY &&
              point.maxY >= minY
            ) {
              candidates.push(point.feature);
            }
          } while ((node = node.next));
        }

        return false; // continue visiting
      }
    );

    return candidates;
  }

  // Find features within a circular area (fast)
  findInCircle(center: [number, number], radiusDegrees: number): string[] {
    const [centerX, centerY] = center;
    const result: string[] = [];

    // Use quadtree to find candidates within bounding box
    const minX = centerX - radiusDegrees;
    const maxX = centerX + radiusDegrees;
    const minY = centerY - radiusDegrees;
    const maxY = centerY + radiusDegrees;

    this.quadTree.visit(
      (node: any, x1: number, y1: number, x2: number, y2: number) => {
        if (x1 > maxX || x2 < minX || y1 > maxY || y2 < minY) {
          return true; // skip
        }

        if (!node.length) {
          do {
            const point = node.data;
            if (point) {
              // Quick distance check using centroid
              const dx = point.x - centerX;
              const dy = point.y - centerY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance <= radiusDegrees) {
                result.push(point.id);
              }
            }
          } while ((node = node.next));
        }

        return false;
      }
    );

    return result;
  }

  // Build adjacency graph efficiently using spatial index
  buildAdjacencyGraph(): Map<string, Set<string>> {
    const adjacencyMap = new Map<string, Set<string>>();

    // Initialize adjacency sets
    for (const [id] of this.featureMap) {
      adjacencyMap.set(id, new Set());
    }

    // Use spatial index to find potential neighbors more efficiently
    for (const [id, feature] of this.featureMap) {
      const bounds = this.boundsCache.get(id);
      if (!bounds) continue;

      // Expand bounds slightly to catch adjacent features
      const [minX, minY, maxX, maxY] = bounds;
      const padding = 0.001; // small padding in degrees
      const expandedBounds: [number, number, number, number] = [
        minX - padding,
        minY - padding,
        maxX + padding,
        maxY + padding,
      ];

      // Find potential neighbors using spatial index
      const candidates = this.findPotentialIntersections(expandedBounds);

      // Check actual adjacency only with candidates (much smaller set)
      for (const candidate of candidates) {
        const candidateId = this.getFeatureId(candidate);
        if (!candidateId || candidateId === id) continue;

        try {
          if (booleanIntersects(feature, candidate)) {
            adjacencyMap.get(id)?.add(candidateId);
            adjacencyMap.get(candidateId)?.add(id);
          }
        } catch (error) {
          // Skip on error rather than crash
          continue;
        }
      }
    }

    return adjacencyMap;
  }

  getFeature(id: string): any | null {
    return this.featureMap.get(id) || null;
  }

  getAllIds(): string[] {
    return Array.from(this.featureMap.keys());
  }
}

// Optimized hole detection using flood fill with spatial indexing
export function findHolesOptimized(
  postalCodesData: any,
  selectedIds: Set<string>
): string[] {
  const startTime = performance.now();

  try {
    // Build spatial index once
    const spatialIndex = new SpatialIndex(postalCodesData.features);

    // Build adjacency graph efficiently
    const adjacencyMap = spatialIndex.buildAdjacencyGraph();

    // Find boundary features (heuristic: features touching map edges)
    const boundaryFeatures = new Set<string>();

    for (const id of spatialIndex.getAllIds()) {
      if (selectedIds.has(id)) continue;

      const feature = spatialIndex.getFeature(id);
      if (!feature) continue;

      // Check if feature touches map boundary using bounding box
      const coords = extractAllCoordinates(feature.geometry);
      const touchesBoundary = coords.some(
        ([lng, lat]: [number, number]) =>
          lat < 47.2 || lat > 55.1 || lng < 5.7 || lng > 15.1
      );

      if (touchesBoundary) {
        boundaryFeatures.add(id);
      }
    }

    // Flood fill from boundary features
    const visited = new Set(boundaryFeatures);
    const queue = Array.from(boundaryFeatures);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current) || new Set();

      for (const neighbor of neighbors) {
        if (!selectedIds.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Find holes (unselected features not reachable from boundary)
    const holes: string[] = [];
    for (const id of spatialIndex.getAllIds()) {
      if (!selectedIds.has(id) && !visited.has(id)) {
        holes.push(id);
      }
    }

    const endTime = performance.now();
    console.log(
      `Optimized hole detection completed in ${endTime - startTime}ms, found ${
        holes.length
      } holes`
    );

    return holes;
  } catch (error) {
    console.error("Error in optimized hole detection:", error);
    return [];
  }
}

function extractAllCoordinates(geometry: any): [number, number][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  } else if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat(2);
  }
  return [];
}
