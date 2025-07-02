"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  MousePointer,
  Lasso,
  Circle,
  Square,
  Triangle,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  PieChart,
  SquareStack,
  Diamond,
  FileSpreadsheet,
  Copy,
  Loader2Icon,
} from "lucide-react";
import { TerraDrawMode } from "@/lib/hooks/use-terradraw";
import { useMapState } from "@/lib/url-state/map-state";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  exportPostalCodesXLSX,
  copyPostalCodesCSV,
} from "@/lib/utils/export-utils";
import { getLargestPolygonCentroid } from "@/lib/utils/map-data";
import union from "@turf/union";
import booleanContains from "@turf/boolean-contains";
import { featureCollection } from "@turf/helpers";
import combine from "@turf/combine";
import booleanIntersects from "@turf/boolean-intersects";
import { toast } from "sonner";
import { SpatialIndex, findHolesOptimized } from "@/lib/utils/spatial-index";
import { emitPerformanceMetric } from "./performance-monitor";

interface DrawingToolsProps {
  currentMode: TerraDrawMode | null;
  onModeChange: (mode: TerraDrawMode | null) => void;
  onClearAll: () => void;
  onToggleVisibility: () => void;
  isVisible: boolean;
  onSearch?: (query: string) => void;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  postalCodesData?: any;
}

const AngledRectangleIcon = (props: any) => (
  <Square
    className={"rotate-45 scale-90 " + (props.className || "")}
    {...props}
  />
);

const drawingModes = [
  {
    id: "cursor" as const,
    name: "Cursor",
    icon: MousePointer,
    description: "Click to select regions",
    category: "selection",
  },
  {
    id: "freehand" as const,
    name: "Lasso",
    icon: Lasso,
    description: "Draw freehand to select regions",
    category: "drawing",
  },
  {
    id: "circle" as const,
    name: "Circle",
    icon: Circle,
    description: "Draw circle to select regions",
    category: "drawing",
  },
  {
    id: "polygon" as const,
    name: "Polygon",
    icon: Triangle,
    description: "Draw polygon by clicking points",
    category: "drawing",
  },
  {
    id: "rectangle" as const,
    name: "Rectangle",
    icon: Square,
    description: "Draw rectangles",
    category: "drawing",
  },
  {
    id: "angled-rectangle" as const,
    name: "Angled Rectangle",
    icon: Diamond,
    description: "Draw angled rectangles",
    category: "drawing",
  },
  {
    id: "sector" as const,
    name: "Sector",
    icon: PieChart,
    description: "Draw circle sectors",
    category: "drawing",
  },
];

// Memoize polygons for each feature
const polygonCache = new WeakMap<any, any[]>();
function getPolygons(feature: any) {
  if (!feature || !feature.geometry) return [];
  if (polygonCache.has(feature)) return polygonCache.get(feature);
  let result: any[] = [];
  if (feature.geometry.type === "Polygon") {
    result = [feature];
  } else if (feature.geometry.type === "MultiPolygon") {
    result = feature.geometry.coordinates.map((coords: any) => ({
      type: "Feature",
      properties: feature.properties,
      geometry: { type: "Polygon", coordinates: coords },
    }));
  }
  polygonCache.set(feature, result);
  return result;
}

// Helper: check if any polygon in region intersects any polygon in combined
function isRegionIntersected(combined: any, region: any) {
  const combinedPolys = getPolygons(combined) || [];
  const regionPolys = getPolygons(region) || [];
  return regionPolys.some((regionPoly: any) =>
    combinedPolys.some((combinedPoly: any) => {
      try {
        return booleanIntersects(combinedPoly, regionPoly);
      } catch {
        return false;
      }
    })
  );
}

// Helper: check if region is adjacent to any selected region
function isRegionAdjacent(region: any, selectedFeatures: any[]) {
  const regionPolys = getPolygons(region) || [];
  return selectedFeatures.some((sel) => {
    const selPolys = getPolygons(sel) || [];
    return regionPolys.some((regionPoly: any) =>
      selPolys.some((selPoly: any) => {
        try {
          return booleanIntersects(regionPoly, selPoly);
        } catch {
          return false;
        }
      })
    );
  });
}

// Helper: flood fill from outside to find holes
function findHoles(postalCodesData: any, selectedIds: Set<string>) {
  // Build adjacency graph
  const features = postalCodesData.features;
  const idMap = new Map<string, any>();
  features.forEach((f: any) => {
    const id = f.properties?.id || f.properties?.PLZ || f.properties?.plz;
    if (id) idMap.set(id, f);
  });
  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const f of features) {
    const id = f.properties?.id || f.properties?.PLZ || f.properties?.plz;
    if (!id) continue;
    adj.set(id, new Set());
    for (const g of features) {
      const gid = g.properties?.id || g.properties?.PLZ || g.properties?.plz;
      if (!gid || gid === id) continue;
      if (isRegionAdjacent(f, [g])) adj.get(id)!.add(gid);
    }
  }
  // Find all regions on the edge (not selected, touching map boundary)
  // For simplicity, treat all unselected regions as possible outside
  const outside = new Set<string>();
  for (const f of features) {
    const id = f.properties?.id || f.properties?.PLZ || f.properties?.plz;
    if (!id || selectedIds.has(id)) continue;
    // Heuristic: if region touches map boundary (min/max lat/lon), treat as outside
    const coords = getPolygons(f).flatMap((poly) =>
      poly.geometry.coordinates.flat(1)
    );
    if (
      coords.some(
        ([lng, lat]: [number, number]) =>
          lat < 47.2 || lat > 55.1 || lng < 5.7 || lng > 15.1
      )
    ) {
      outside.add(id);
    }
  }
  // Flood fill from outside
  const visited = new Set(outside);
  const queue = Array.from(outside);
  while (queue.length) {
    const curr = queue.pop()!;
    for (const neighbor of adj.get(curr) ?? []) {
      if (!selectedIds.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  // Any unselected region not visited is a hole
  const holes: string[] = [];
  for (const f of features) {
    const id = f.properties?.id || f.properties?.PLZ || f.properties?.plz;
    if (!id || selectedIds.has(id)) continue;
    if (!visited.has(id)) holes.push(id);
  }
  return holes;
}

// Optimized fill logic with spatial indexing and Web Workers simulation
async function fillRegionsOptimized(
  mode: "all" | "holes" | "expand",
  postalCodesData: any,
  selectedRegions: string[],
  setSelectedRegions: (ids: string[]) => void,
  setIsFilling: (b: boolean) => void
) {
  const startTime = performance.now();
  setIsFilling(true);

  try {
    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 16));

    const selectedIds = new Set(selectedRegions);
    const features = postalCodesData.features;
    let toAdd: string[] = [];

    if (mode === "holes") {
      // Use optimized hole detection
      toAdd = findHolesOptimized(postalCodesData, selectedIds);
    } else {
      // Build spatial index once for this operation
      const spatialIndex = new SpatialIndex(features);

      if (mode === "all") {
        toAdd = await fillAllGapsOptimized(features, selectedIds, spatialIndex);
      } else if (mode === "expand") {
        toAdd = await expandSelectionOptimized(
          features,
          selectedIds,
          spatialIndex
        );
      }
    }

    const newSelection = Array.from(new Set([...selectedRegions, ...toAdd]));
    setSelectedRegions(newSelection);

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Emit performance metric
    emitPerformanceMetric(`Fill ${mode}`, duration, features.length);

    toast.success(
      `✅ Added ${toAdd.length} region${
        toAdd.length === 1 ? "" : "s"
      } in ${duration}ms (${
        mode === "all" ? "all gaps" : mode === "holes" ? "holes" : "one layer"
      })`
    );
  } catch (error) {
    console.error("Error in fill operation:", error);
    toast.error("❌ Fill operation failed. Please try again.");
  } finally {
    setIsFilling(false);
  }
}

// Optimized "fill all gaps" using spatial indexing
async function fillAllGapsOptimized(
  features: any[],
  selectedIds: Set<string>,
  spatialIndex: SpatialIndex
): Promise<string[]> {
  const selectedFeatures = features.filter((f: any) => {
    const id = getFeatureId(f);
    return id && selectedIds.has(id);
  });

  if (selectedFeatures.length < 3) {
    return [];
  }

  // Combine selected features once
  const combined = combine({
    type: "FeatureCollection",
    features: selectedFeatures,
  });
  if (!combined?.features?.[0]) {
    return [];
  }

  const multiPoly = combined.features[0];
  const toAdd: string[] = [];

  // Get bounding box of combined selection
  const bounds = getBounds(multiPoly);
  if (!bounds) return [];

  // Use spatial index to find candidates within bounding box
  const candidates = spatialIndex.findPotentialIntersections(bounds);

  // Process candidates in chunks to prevent UI blocking
  const CHUNK_SIZE = 100;
  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);

    for (const feature of chunk) {
      const id = getFeatureId(feature);
      if (!id || selectedIds.has(id)) continue;

      try {
        if (booleanIntersects(multiPoly, feature)) {
          toAdd.push(id);
        }
      } catch {
        // Skip problematic features rather than crash
        continue;
      }
    }

    // Yield to event loop every chunk
    if (i + CHUNK_SIZE < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return toAdd;
}

// Optimized "expand selection" using spatial indexing
async function expandSelectionOptimized(
  features: any[],
  selectedIds: Set<string>,
  spatialIndex: SpatialIndex
): Promise<string[]> {
  const selectedFeatures = features.filter((f: any) => {
    const id = getFeatureId(f);
    return id && selectedIds.has(id);
  });

  if (selectedFeatures.length === 0) {
    return [];
  }

  const adjacencyMap = spatialIndex.buildAdjacencyGraph();

  // Find all neighbors of selected regions
  const neighbors = new Set<string>();
  for (const feature of selectedFeatures) {
    const id = getFeatureId(feature);
    if (!id) continue;

    const featureNeighbors = adjacencyMap.get(id);
    if (featureNeighbors) {
      for (const neighbor of featureNeighbors) {
        if (!selectedIds.has(neighbor)) {
          neighbors.add(neighbor);
        }
      }
    }
  }

  return Array.from(neighbors);
}

// Helper function to get feature ID consistently
function getFeatureId(feature: any): string | null {
  return (
    feature.properties?.id ||
    feature.properties?.PLZ ||
    feature.properties?.plz ||
    null
  );
}

// Helper function to get bounding box of a feature
function getBounds(feature: any): [number, number, number, number] | null {
  try {
    const coords = extractCoordinates(feature.geometry);
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

    return [minX, minY, maxX, maxY];
  } catch {
    return null;
  }
}

function extractCoordinates(geometry: any): [number, number][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] || [];
  } else if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly: number[][][]) => poly[0] || []);
  }
  return [];
}

function DrawingToolsImpl({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
  isVisible,
  onSearch,
  granularity,
  onGranularityChange,
  postalCodesData,
}: DrawingToolsProps) {
  const { selectedRegions, clearSelectedRegions, setSelectedRegions } =
    useMapState();

  const handleModeClick = (mode: TerraDrawMode) => {
    if (currentMode === mode) {
      onModeChange(null); // Deselect if clicking the same mode
    } else {
      onModeChange(mode);
    }
  };

  const allModes = drawingModes;

  // Helper: get all postal codes as array, prepending D-
  const getPostalCodes = () => {
    if (!postalCodesData || !postalCodesData.features) return [];
    // If any selected, only export those
    const codes = postalCodesData.features
      .map(
        (f: any) => f.properties?.PLZ || f.properties?.plz || f.properties?.id
      )
      .filter(Boolean);
    if (selectedRegions && selectedRegions.length > 0) {
      return codes
        .filter((code: string) => selectedRegions.includes(code))
        .map((code: string) => `D-${code}`);
    }
    return codes.map((code: string) => `D-${code}`);
  };

  // Export as Excel
  const handleExportExcel = async () => {
    const codes = getPostalCodes();
    await exportPostalCodesXLSX(codes);
  };

  // Copy as CSV
  const handleCopyCSV = async () => {
    const codes = getPostalCodes();
    await copyPostalCodesCSV(codes);
  };

  // --- UI State ---
  const [isFilling, setIsFilling] = useState(false);

  return (
    <Card role="region" aria-label="Map Tools Panel">
      <CardHeader>
        <CardTitle>Map Tools</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVisibility}
            title="Hide map tools panel"
            aria-label="Hide map tools panel"
            style={{ margin: "-8px" }}
            className="focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Granularity select (if provided) */}
        {granularity && onGranularityChange && (
          <div className="mb-2">
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plz-1stellig">PLZ 1-stellig</SelectItem>
                <SelectItem value="plz-2stellig">PLZ 2-stellig</SelectItem>
                <SelectItem value="plz-3stellig">PLZ 3-stellig</SelectItem>
                <SelectItem value="plz-5stellig">PLZ 5-stellig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-2">
          {allModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            return (
              <Button
                key={mode.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => handleModeClick(mode.id)}
                title={mode.description}
                aria-label={mode.name}
              >
                <Icon className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs">{mode.name}</span>
              </Button>
            );
          })}
        </div>

        <Separator />

        {/* Selected Regions */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Selected Regions</span>
            <span className="text-xs text-muted-foreground">
              {selectedRegions.length} selected
            </span>
          </div>
          {selectedRegions.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-1">
              {selectedRegions.slice(0, 5).map((region: string) => (
                <div
                  key={region}
                  className="text-xs p-2 bg-muted rounded flex justify-between items-center"
                >
                  <span className="truncate">{region}</span>
                </div>
              ))}
              {selectedRegions.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{selectedRegions.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>
        {/* Only show separator if at least one action button is visible */}
        {(currentMode && currentMode !== "cursor") ||
        selectedRegions.length > 0 ? (
          <Separator />
        ) : null}
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {currentMode && currentMode !== "cursor" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearAll}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Clear all drawings and selections"
              aria-label="Clear all drawings and selections"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          {selectedRegions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelectedRegions}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Clear selected regions"
              aria-label="Clear selected regions"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Deselect
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            disabled={isFilling || selectedRegions.length < 3}
            onClick={() =>
              fillRegionsOptimized(
                "all",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling
              )
            }
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Fill all gaps (no holes)"
            aria-label="Fill all gaps (no holes)"
          >
            {isFilling ? (
              <Loader2Icon className="animate-spin mr-2" />
            ) : (
              <PieChart className="h-4 w-4 mr-2" />
            )}
            Fill All Gaps (No Holes)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isFilling || selectedRegions.length < 3}
            onClick={() =>
              fillRegionsOptimized(
                "holes",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling
              )
            }
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Fill only holes inside the selection"
            aria-label="Fill only holes"
          >
            {isFilling ? (
              <Loader2Icon className="animate-spin mr-2" />
            ) : (
              <Diamond className="h-4 w-4 mr-2" />
            )}
            Fill Only Holes
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isFilling || selectedRegions.length < 3}
            onClick={() =>
              fillRegionsOptimized(
                "expand",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling
              )
            }
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Expand selection by one layer"
            aria-label="Expand by one layer"
          >
            {isFilling ? (
              <Loader2Icon className="animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Expand by One Layer
          </Button>
        </div>

        {/* Export/Copy Buttons at the bottom */}
        {postalCodesData && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              title="Export as XLS"
              aria-label="Export as XLS"
              className="focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export XLS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCSV}
              title="Copy as CSV"
              aria-label="Copy as CSV"
              className="focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DrawingTools(props: DrawingToolsProps) {
  return (
    <Suspense
      fallback={<Skeleton className="w-full h-full min-h-[200px] rounded-lg" />}
    >
      <DrawingToolsImpl {...props} />
    </Suspense>
  );
}
