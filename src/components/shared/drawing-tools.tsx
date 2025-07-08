"use client"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from '@/components/ui/skeleton'
import { TerraDrawMode } from "@/lib/hooks/use-terradraw"
import { useMapState } from "@/lib/url-state/map-state"
import { copyPostalCodesCSV, exportPostalCodesXLSX } from '@/lib/utils/export-utils'
import booleanIntersects from '@turf/boolean-intersects'
import combine from '@turf/combine'
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson'
import {
  Circle,
  Copy,
  Diamond,
  EyeOff,
  FileSpreadsheet,
  Lasso,
  Loader2Icon,
  MousePointer,
  PieChart,
  Plus,
  Square,
  Trash2,
  Triangle,
  X
} from "lucide-react"
import { Suspense, useState } from "react"
import { toast } from "sonner"

interface DrawingToolsProps {
  currentMode: TerraDrawMode | null
  onModeChange: (mode: TerraDrawMode | null) => void
  onClearAll: () => void
  onToggleVisibility: () => void
  granularity?: string
  onGranularityChange?: (granularity: string) => void
  postalCodesData?: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
}


const drawingModes = [
  {
    id: 'cursor' as const,
    name: 'Cursor',
    icon: MousePointer,
    description: 'Click to select regions',
    category: 'selection'
  },
  {
    id: 'freehand' as const,
    name: 'Lasso',
    icon: Lasso,
    description: 'Draw freehand to select regions',
    category: 'drawing'
  },
  {
    id: 'circle' as const,
    name: 'Circle',
    icon: Circle,
    description: 'Draw circle to select regions',
    category: 'drawing'
  },
  {
    id: 'polygon' as const,
    name: 'Polygon',
    icon: Triangle,
    description: 'Draw polygon by clicking points',
    category: 'drawing'
  },
  {
    id: 'rectangle' as const,
    name: 'Rectangle',
    icon: Square,
    description: 'Draw rectangles',
    category: 'drawing'
  },
  {
    id: 'angled-rectangle' as const,
    name: 'Angled Rectangle',
    icon: Diamond,
    description: 'Draw angled rectangles',
    category: 'drawing'
  },
  {
    id: 'sector' as const,
    name: 'Sector',
    icon: PieChart,
    description: 'Draw circle sectors',
    category: 'drawing'
  }
]

// Memoize polygons for each feature
const polygonCache = new WeakMap<object, Feature<Polygon>[]>();
function getPolygons(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon>[] {
  if (!feature || !feature.geometry) return [];
  if (polygonCache.has(feature)) return polygonCache.get(feature)!;
  let result: Feature<Polygon>[] = [];
  if (feature.geometry.type === 'Polygon') {
    result = [feature as Feature<Polygon>];
  } else if (feature.geometry.type === 'MultiPolygon') {
    result = (feature.geometry.coordinates as number[][][][]).map((coords) => ({
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: coords },
    }));
  }
  polygonCache.set(feature, result);
  return result;
}

// Helper: check if any polygon in region intersects any polygon in combined
function isRegionIntersected(combined: Feature<Polygon | MultiPolygon>, region: Feature<Polygon | MultiPolygon>) {
  const combinedPolys = getPolygons(combined) || [];
  const regionPolys = getPolygons(region) || [];
  return regionPolys.some((regionPoly) =>
    combinedPolys.some((combinedPoly) => {
      try {
        return booleanIntersects(combinedPoly, regionPoly);
      } catch {
        return false;
      }
    })
  );
}

// Helper: check if region is adjacent to any selected region
function isRegionAdjacent(region: Feature<Polygon | MultiPolygon>, selectedFeatures: Feature<Polygon | MultiPolygon>[]) {
  const regionPolys = getPolygons(region) || [];
  return selectedFeatures.some(sel => {
    const selPolys = getPolygons(sel) || [];
    return regionPolys.some((regionPoly) =>
      selPolys.some((selPoly) => {
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
function findHoles(postalCodesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>, selectedIds: Set<string>) {
  // Build adjacency graph
  const features = postalCodesData.features;
  const idMap = new Map<string, Feature<Polygon | MultiPolygon>>();
  features.forEach((f) => {
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
    const coords = getPolygons(f).flatMap(poly => Array.isArray(poly.geometry.coordinates) ? poly.geometry.coordinates.flat(1) : []);
    if (coords.some((coord) => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number' && (coord[1] < 47.2 || coord[1] > 55.1 || coord[0] < 5.7 || coord[0] > 15.1))) {
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

// Fill logic (chunked for large datasets)
async function fillRegions(
  mode: 'all' | 'holes' | 'expand',
  postalCodesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>,
  selectedRegions: string[],
  setSelectedRegions: (ids: string[]) => void,
  setIsFilling: (b: boolean) => void
) {
  setIsFilling(true);
  await new Promise(r => setTimeout(r, 10)); // allow UI update
  const selectedIds = new Set(selectedRegions);
  const features = postalCodesData.features;
  let toAdd: string[] = [];
  if (mode === 'all') {
    const selectedFeatures = features.filter((f) => selectedIds.has(f.properties?.id || f.properties?.PLZ || f.properties?.plz));
    if (selectedFeatures.length < 3) {
      setIsFilling(false);
      return;
    }
    const combined = combine({ type: 'FeatureCollection', features: selectedFeatures });
    if (!combined || !combined.features || combined.features.length === 0) {
      setIsFilling(false);
      return;
    }
    // Only use the first feature if it is a Polygon or MultiPolygon
    const multiPoly = combined.features[0];
    if (!multiPoly || !(['Polygon', 'MultiPolygon'] as string[]).includes(multiPoly.geometry.type)) {
      setIsFilling(false);
      return;
    }
    // Chunked processing for large datasets
    const CHUNK_SIZE = 200;
    let idx = 0;
    while (idx < features.length) {
      const chunk = features.slice(idx, idx + CHUNK_SIZE);
      toAdd.push(...chunk
        .filter((f) => !selectedIds.has(f.properties?.id || f.properties?.PLZ || f.properties?.plz))
        .filter((f) => isRegionIntersected(multiPoly as Feature<Polygon | MultiPolygon, GeoJsonProperties>, f as Feature<Polygon | MultiPolygon, GeoJsonProperties>))
        .map((f) => f.properties?.id || f.properties?.PLZ || f.properties?.plz)
        .filter(Boolean));
      idx += CHUNK_SIZE;
      await new Promise(r => setTimeout(r, 0)); // yield to event loop
    }
  } else if (mode === 'expand') {
    const selectedFeatures = features.filter((f) => selectedIds.has(f.properties?.id || f.properties?.PLZ || f.properties?.plz));
    const CHUNK_SIZE = 200;
    let idx = 0;
    while (idx < features.length) {
      const chunk = features.slice(idx, idx + CHUNK_SIZE);
      toAdd.push(...chunk
        .filter((f) => !selectedIds.has(f.properties?.id || f.properties?.PLZ || f.properties?.plz))
        .filter((f) => isRegionAdjacent(f, selectedFeatures))
        .map((f) => f.properties?.id || f.properties?.PLZ || f.properties?.plz)
        .filter(Boolean));
      idx += CHUNK_SIZE;
      await new Promise(r => setTimeout(r, 0));
    }
  } else if (mode === 'holes') {
    // Holes are usually much fewer, so no chunking needed
    toAdd = findHoles(postalCodesData, selectedIds);
  }
  const newSelection = Array.from(new Set([...selectedRegions, ...toAdd]));
  setSelectedRegions(newSelection);
  setIsFilling(false);
  toast.success(`Filled ${toAdd.length} region${toAdd.length === 1 ? '' : 's'} (${mode === 'all' ? 'all gaps' : mode === 'holes' ? 'holes' : 'one layer'})`);
}

function DrawingToolsImpl({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
  granularity,
  onGranularityChange,
  postalCodesData
}: DrawingToolsProps) {
  const { selectedRegions, clearSelectedRegions, setSelectedRegions } = useMapState()

  const handleModeClick = (mode: TerraDrawMode) => {
    if (currentMode === mode) {
      onModeChange(null) // Deselect if clicking the same mode
    } else {
      onModeChange(mode)
    }
  }

  const allModes = drawingModes

  // Helper: get all postal codes as array, prepending D-
  const getPostalCodes = () => {
    if (!postalCodesData || !postalCodesData.features) return []
    // If any selected, only export those
    const codes = postalCodesData.features
      .map((f) => f.properties?.PLZ || f.properties?.plz || f.properties?.id)
      .filter(Boolean)
    if (selectedRegions && selectedRegions.length > 0) {
      return codes
        .filter((code: string) => selectedRegions.includes(code))
        .map((code: string) => `D-${code}`)
    }
    return codes.map((code: string) => `D-${code}`)
  }

  // Export as Excel
  const handleExportExcel = async () => {
    const codes = getPostalCodes()
    await exportPostalCodesXLSX(codes)
  }

  // Copy as CSV
  const handleCopyCSV = async () => {
    const codes = getPostalCodes()
    await copyPostalCodesCSV(codes)
  }

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
            style={{ margin: '-8px' }}
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
                <SelectItem value="1digit">PLZ 1-stellig</SelectItem>
                <SelectItem value="2digit">PLZ 2-stellig</SelectItem>
                <SelectItem value="3digit">PLZ 3-stellig</SelectItem>
                <SelectItem value="5digit">PLZ 5-stellig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-2">
          {allModes.map((mode) => {
            const Icon = mode.icon
            const isActive = currentMode === mode.id
            return (
              <Button
                key={mode.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => handleModeClick(mode.id)}
                title={mode.description}
                aria-label={mode.name}
              >
                <Icon className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs">{mode.name}</span>
              </Button>
            )
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
        {(currentMode && currentMode !== 'cursor') || selectedRegions.length > 0 ? <Separator /> : null}
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {currentMode && currentMode !== 'cursor' && (
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
          onClick={() => postalCodesData && fillRegions('all', postalCodesData, selectedRegions, setSelectedRegions, setIsFilling)}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Fill all gaps (no holes)"
            aria-label="Fill all gaps (no holes)"
          >
            {isFilling ? <Loader2Icon className="animate-spin mr-2" /> : <PieChart className="h-4 w-4 mr-2" />}
            Fill All Gaps (No Holes)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isFilling || selectedRegions.length < 3}
          onClick={() => postalCodesData && fillRegions('holes', postalCodesData, selectedRegions, setSelectedRegions, setIsFilling)}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Fill only holes inside the selection"
            aria-label="Fill only holes"
          >
            {isFilling ? <Loader2Icon className="animate-spin mr-2" /> : <Diamond className="h-4 w-4 mr-2" />}
            Fill Only Holes
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isFilling || selectedRegions.length < 3}
          onClick={() => postalCodesData && fillRegions('expand', postalCodesData, selectedRegions, setSelectedRegions, setIsFilling)}
            className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
            title="Expand selection by one layer"
            aria-label="Expand by one layer"
          >
            {isFilling ? <Loader2Icon className="animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Expand by One Layer
          </Button>
        </div>

        {/* Export/Copy Buttons at the bottom */}
        {postalCodesData && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleExportExcel} title="Export as XLS" aria-label="Export as XLS" className="focus:outline-none focus:ring-2 focus:ring-primary">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export XLS
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyCSV} title="Copy as CSV" aria-label="Copy as CSV" className="focus:outline-none focus:ring-2 focus:ring-primary">
              <Copy className="h-4 w-4 mr-2" />
              Copy CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DrawingTools(props: DrawingToolsProps) {
  return (
    <Suspense fallback={<Skeleton className="w-full h-full min-h-[200px] rounded-lg" />}>
      <DrawingToolsImpl {...props} />
    </Suspense>
  )
}