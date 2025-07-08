"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Square,
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
    description: "Klicken Sie, um Regionen auszuwählen",
    category: "selection",
  },
  {
    id: "freehand" as const,
    name: "Lasso",
    icon: Lasso,
    description: "Freihand zeichnen, um Regionen auszuwählen",
    category: "drawing",
  },
  {
    id: "circle" as const,
    name: "Kreis",
    icon: Circle,
    description: "Kreis zeichnen, um Regionen auszuwählen",
    category: "drawing",
  },
  {
    id: "polygon" as const,
    name: "Polygon",
    icon: Triangle,
    description: "Polygon zeichnen, indem Sie Punkte klicken",
    category: "drawing",
  },
  {
    id: "rectangle" as const,
    name: "Rechteck",
    icon: Square,
    description: "Rechtecke zeichnen",
    category: "drawing",
  },
  {
    id: "angled-rectangle" as const,
    name: "Rechteck mit Winkel",
    icon: Diamond,
    description: "Rechtecke mit Winkeln zeichnen",
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
      toast.error("Granularität ist erforderlich für die Geoverarbeitung");
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
      toast.error("Server-Geoverarbeitung fehlgeschlagen");
      return;
    }
    const { resultCodes } = await response.json();
    const newSelection = Array.from(
      new Set([...selectedRegions, ...(resultCodes || [])])
    );
    setSelectedRegions(newSelection);
    setIsFilling(false);
    toast.success(
      `Gefüllt ${(resultCodes || []).length} Region${
        (resultCodes || []).length === 1 ? "" : "en"
      } (${
        mode === "all"
          ? "alle Lücken"
          : mode === "holes"
          ? "Lücken"
          : "eine Ebene"
      })`
    );
  } catch {
    setIsFilling(false);
    toast.error("Fehler bei der Geoverarbeitung");
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
  const { selectedRegions, setSelectedRegions } = useMapState();

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
        <CardTitle>Kartentools</CardTitle>
        <button
          type="button"
          onClick={onToggleVisibility}
          title="Werkzeugleiste ausblenden"
          aria-label="Werkzeugleiste ausblenden"
          className="ml-auto p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Granularität Auswahl */}
        {granularity && onGranularityChange && (
          <div className="mb-2">
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Granularität wählen" />
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
        {/* Werkzeuge Grid */}
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

        {/* Ausgewählte Regionen */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Ausgewählte Regionen</span>
            <span className="text-xs text-muted-foreground">
              {selectedRegions.length} ausgewählt
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
                  +{selectedRegions.length - 5} weitere
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
        {/* Aktionsbutton: Nur Löcher füllen */}
        <div className="grid grid-cols-1 gap-2">
          {currentMode && currentMode !== "cursor" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearAll}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Alle Zeichnungen und Auswahlen löschen"
              aria-label="Alles löschen"
            >
              <X className="h-4 w-4 mr-2" />
              Alles löschen
            </Button>
          )}
          {selectedRegions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRegions([])}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Auswahl aufheben"
              aria-label="Deselektieren"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Deselektieren
            </Button>
          )}
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
            title="Nur vollständig umschlossene Regionen füllen"
            aria-label="Nur Löcher füllen"
          >
            {isFilling ? (
              <Loader2Icon className="animate-spin mr-2" />
            ) : (
              <Diamond className="h-4 w-4 mr-2" />
            )}
            Nur Löcher füllen
          </Button>
        </div>

        {/* Export/Copy Buttons unten */}
        {postalCodesData && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              title="Als XLS exportieren"
              aria-label="Als XLS exportieren"
              className="focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              XLS exportieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCSV}
              title="Als CSV kopieren"
              aria-label="Als CSV kopieren"
              className="focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Copy className="h-4 w-4 mr-2" />
              CSV kopieren
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
