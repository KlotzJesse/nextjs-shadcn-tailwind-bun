"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TerraDrawMode } from "@/lib/hooks/use-terradraw";
import { useMapState } from "@/lib/url-state/map-state";
import {
  copyPostalCodesCSV,
  exportPostalCodesXLSX,
} from "@/lib/utils/export-utils";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
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
  X,
} from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

interface DrawingToolsProps {
  currentMode: TerraDrawMode | null;
  onModeChange: (mode: TerraDrawMode | null) => void;
  onClearAll: () => void;
  onToggleVisibility: () => void;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  postalCodesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  >;
}

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
  /*{
    id: 'sector' as const,
    name: 'Sector',
    icon: PieChart,
    description: 'Draw circle sectors',
    category: 'drawing'
  }*/
];

// Fill logic using server-side geoprocessing API
async function fillRegions(
  mode: "all" | "holes" | "expand",
  _postalCodesData: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  >,
  selectedRegions: string[],
  setSelectedRegions: (codes: string[]) => void,
  setIsFilling: (b: boolean) => void,
  granularity?: string
) {
  setIsFilling(true);
  try {
    if (!granularity) {
      setIsFilling(false);
      toast.error("Granularity is required for geoprocessing");
      return;
    }
    console.log(
      "Filling regions with mode:",
      mode,
      "granularity:",
      granularity,
      "selectedRegions:",
      selectedRegions
    );
    const response = await fetch("/api/geoprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        granularity,
        selectedCodes: selectedRegions,
      }),
    });
    if (!response.ok) {
      setIsFilling(false);
      toast.error("Server geoprocessing failed");
      return;
    }
    const { resultCodes } = await response.json();
    const newSelection = Array.from(
      new Set([...selectedRegions, ...(resultCodes || [])])
    );
    setSelectedRegions(newSelection);
    setIsFilling(false);
    toast.success(
      `Filled ${(resultCodes || []).length} region${
        (resultCodes || []).length === 1 ? "" : "s"
      } (${
        mode === "all" ? "all gaps" : mode === "holes" ? "holes" : "one layer"
      })`
    );
  } catch {
    setIsFilling(false);
    toast.error("Error during geoprocessing");
  }
}

function DrawingToolsImpl({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
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
      .map((f) => f.properties?.code || f.properties?.PLZ || f.properties?.plz)
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
              postalCodesData &&
              fillRegions(
                "all",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling,
                granularity
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
              postalCodesData &&
              fillRegions(
                "holes",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling,
                granularity
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
              postalCodesData &&
              fillRegions(
                "expand",
                postalCodesData,
                selectedRegions,
                setSelectedRegions,
                setIsFilling,
                granularity
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
