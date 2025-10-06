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
  Square,
  Triangle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAreaLayers } from "@/lib/hooks/use-area-layers";
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconPalette,
  IconAlertTriangle,
  IconClock,
  IconDeviceFloppy,
  IconGitMerge,
} from "@tabler/icons-react";
import { ConflictResolutionDialog } from "@/components/areas/conflict-resolution-dialog";
import { VersionHistoryDialog } from "@/components/areas/version-history-dialog";
import { CreateVersionDialog } from "@/components/areas/create-version-dialog";
import { LayerMergeDialog } from "@/components/areas/layer-merge-dialog";

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
  pendingPostalCodes?: string[];
  onAddPending?: () => void;
  onRemovePending?: () => void;
  // Layer management props
  areaId?: number;
  activeLayerId?: number | null;
  onLayerSelect?: (layerId: number) => void;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

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
  if (!granularity) {
    toast.error("Granularität ist erforderlich für die Geoverarbeitung");
    return;
  }

  const fillPromise = async () => {
    setIsFilling(true);

    try {
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
        throw new Error("Server-Geoverarbeitung fehlgeschlagen");
      }

      const { resultCodes } = await response.json();
      const newSelection = Array.from(
        new Set([...selectedRegions, ...(resultCodes || [])])
      );
      setSelectedRegions(newSelection);

      const count = (resultCodes || []).length;
      const modeText =
        mode === "all"
          ? "alle Lücken"
          : mode === "holes"
          ? "Lücken"
          : "eine Ebene";

      return `${count} Region${count === 1 ? "" : "en"} gefüllt (${modeText})`;
    } finally {
      setIsFilling(false);
    }
  };

  toast.promise(fillPromise(), {
    loading: "Geoverarbeitung läuft...",
    success: (message) => message,
    error: "Fehler bei der Geoverarbeitung",
  });
}

function DrawingToolsImpl({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
  granularity,
  onGranularityChange,
  postalCodesData,
  pendingPostalCodes = [],
  onAddPending,
  onRemovePending,
  areaId,
  activeLayerId,
  onLayerSelect,
}: DrawingToolsProps) {
  const { selectedRegions, setSelectedRegions } = useMapState();

  // Collapsible section states
  const [toolsOpen, setToolsOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(areaId ? true : false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Layer management state
  const {
    layers,
    fetchLayers,
    createLayer,
    updateLayer,
    toggleLayerVisibility,
    updateLayerColor,
  } = useAreaLayers(areaId || 0);

  const [newLayerName, setNewLayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showLayerMerge, setShowLayerMerge] = useState(false);

  useEffect(() => {
    if (areaId) {
      fetchLayers();
    }
  }, [areaId, fetchLayers]);

  const handleModeClick = (mode: TerraDrawMode) => {
    if (currentMode === mode) {
      // Deactivate current mode
      onModeChange(null);
      const modeInfo = drawingModes.find((m) => m.id === mode);
      toast.success(`🖱️ ${modeInfo?.name || "Werkzeug"} deaktiviert`, {
        duration: 2000,
      });
    } else {
      // Activate new mode
      onModeChange(mode);
      const modeInfo = drawingModes.find((m) => m.id === mode);
      toast.success(`🎯 ${modeInfo?.name || "Werkzeug"} aktiviert`, {
        description: modeInfo?.description,
        duration: 3000,
      });
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

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) return;

    setIsCreating(true);
    try {
      const nextColor = DEFAULT_COLORS[layers.length % DEFAULT_COLORS.length];
      await createLayer({
        name: newLayerName,
        color: nextColor,
        orderIndex: layers.length,
      });
      setNewLayerName("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleColorChange = async (layerId: number, color: string) => {
    await updateLayerColor(layerId, color);
  };

  const handleOpacityChange = async (layerId: number, opacity: number) => {
    await updateLayer(layerId, { opacity });
  };

  return (
    <Card role="region" aria-label="Kartentools-Panel" className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Kartentools</CardTitle>
        <CardAction>
          <button
            type="button"
            onClick={onToggleVisibility}
            title="Werkzeugleiste ausblenden"
            aria-label="Werkzeugleiste ausblenden"
            className="ml-auto p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Layer Management Section - Only show if areaId is provided */}
        {areaId && (
          <>
            <Collapsible open={layersOpen} onOpenChange={setLayersOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-7 px-2 text-xs font-semibold"
                >
                  <span>Layer ({layers.length})</span>
                  {layersOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {/* Layer action buttons */}
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    onClick={() => setShowConflicts(true)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-1.5"
                    title="Konflikte"
                  >
                    <IconAlertTriangle className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setShowVersionHistory(true)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-1.5"
                    title="Historie"
                  >
                    <IconClock className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setShowCreateVersion(true)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-1.5"
                    title="Snapshot"
                  >
                    <IconDeviceFloppy className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setShowLayerMerge(true)}
                    variant="outline"
                    size="sm"
                    className="h-7 px-1.5"
                    title="Merge"
                  >
                    <IconGitMerge className="h-3 w-3" />
                  </Button>
                </div>

                {/* Create new layer */}
                <div className="flex gap-1">
                  <Input
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    placeholder="Neuer Layer..."
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateLayer();
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateLayer}
                    disabled={!newLayerName.trim() || isCreating}
                    size="icon"
                    className="h-7 w-7"
                  >
                    <IconPlus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Layer list */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`p-1.5 rounded border cursor-pointer transition-colors ${
                        activeLayerId === layer.id
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => onLayerSelect?.(layer.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded flex-shrink-0"
                            style={{
                              backgroundColor: layer.color,
                              opacity: layer.opacity / 100,
                            }}
                          />
                          <span className="font-medium text-xs truncate">
                            {layer.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({layer.postalCodes?.length || 0})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                        >
                          {layer.isVisible === "true" ? (
                            <IconEye className="h-2.5 w-2.5" />
                          ) : (
                            <IconEyeOff className="h-2.5 w-2.5" />
                          )}
                        </Button>
                      </div>

                      {/* Color and opacity controls */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-1 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconPalette className="h-2.5 w-2.5 mr-0.5" />
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: layer.color }}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-2"
                              onClick={(e: React.MouseEvent) =>
                                e.stopPropagation()
                              }
                            >
                              <div className="grid grid-cols-4 gap-1.5">
                                {DEFAULT_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    className="w-7 h-7 rounded border-2 border-transparent hover:border-primary"
                                    style={{ backgroundColor: color }}
                                    onClick={() =>
                                      handleColorChange(layer.id, color)
                                    }
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Slider
                            value={[layer.opacity]}
                            onValueChange={([value]) =>
                              handleOpacityChange(layer.id, value)
                            }
                            min={0}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-xs w-7 text-right flex-shrink-0">
                            {layer.opacity}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Drawing Tools Section */}
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-7 px-2 text-xs font-semibold"
            >
              <span>Zeichenwerkzeuge</span>
              {toolsOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {/* Granularität Auswahl */}
            {granularity && onGranularityChange && (
              <Select value={granularity} onValueChange={onGranularityChange}>
                <SelectTrigger className="w-full h-7 text-xs">
                  <SelectValue placeholder="Granularität" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1digit">PLZ 1</SelectItem>
                  <SelectItem value="2digit">PLZ 2</SelectItem>
                  <SelectItem value="3digit">PLZ 3</SelectItem>
                  <SelectItem value="5digit">PLZ 5</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Werkzeuge Grid - compact */}
            <div className="grid grid-cols-3 gap-1">
              {allModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-auto p-1.5 flex flex-col items-center gap-0.5"
                    onClick={() => handleModeClick(mode.id)}
                    title={mode.description}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="text-[10px] leading-none">
                      {mode.name}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Regions Section */}
        <Collapsible
          open={regionsOpen}
          onOpenChange={setRegionsOpen}
          className="space-y-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-7 px-2 text-xs font-semibold"
            >
              <span>
                Regionen ({pendingPostalCodes.length + selectedRegions.length})
              </span>
              {regionsOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {/* Gefundene Regionen durch Zeichnung */}
            {pendingPostalCodes.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-medium">Gefunden</span>
                  <span className="text-xs text-muted-foreground">
                    {pendingPostalCodes.length}
                  </span>
                </div>
                <div className="max-h-20 overflow-y-auto space-y-0.5">
                  {pendingPostalCodes.slice(0, 5).map((region: string) => (
                    <div
                      key={region}
                      className="text-xs p-1 bg-muted rounded truncate"
                    >
                      {region}
                    </div>
                  ))}
                  {pendingPostalCodes.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center py-0.5">
                      +{pendingPostalCodes.length - 5}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onAddPending}
                    className="h-6 text-xs"
                    title="Gefundene zur Auswahl hinzufügen"
                  >
                    Hinzufügen
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onRemovePending}
                    className="h-6 text-xs"
                    title="Gefundene aus Auswahl entfernen"
                  >
                    Entfernen
                  </Button>
                </div>
                <Separator />
              </div>
            )}

            {/* Ausgewählte Regionen */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-medium">Ausgewählt</span>
                <span className="text-xs text-muted-foreground">
                  {selectedRegions.length}
                </span>
              </div>
              {selectedRegions.length > 0 && (
                <div className="max-h-20 overflow-y-auto space-y-0.5">
                  {selectedRegions.slice(0, 5).map((region: string) => (
                    <div
                      key={region}
                      className="text-xs p-1 bg-muted rounded truncate"
                    >
                      {region}
                    </div>
                  ))}
                  {selectedRegions.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center py-0.5">
                      +{selectedRegions.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions Section */}
        {((currentMode && currentMode !== "cursor") ||
          selectedRegions.length > 0) && (
          <>
            <Separator />
            <Collapsible
              open={actionsOpen}
              onOpenChange={setActionsOpen}
              className="space-y-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-7 px-2 text-xs font-semibold"
                >
                  <span>Aktionen</span>
                  {actionsOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                {currentMode && currentMode !== "cursor" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onClearAll();
                      toast.success("🗑️ Zeichnungen gelöscht", {
                        duration: 2000,
                      });
                    }}
                    className="w-full h-7 text-xs"
                    title="Alle Zeichnungen löschen"
                  >
                    <X className="h-3 w-3 mr-1.5" />
                    Zeichnung löschen
                  </Button>
                )}
                {selectedRegions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const count = selectedRegions.length;
                      setSelectedRegions([]);
                      toast.success(`📍 ${count} abgewählt`, {
                        duration: 2000,
                      });
                    }}
                    className="w-full h-7 text-xs"
                    title="Auswahl aufheben"
                  >
                    <EyeOff className="h-3 w-3 mr-1.5" />
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
                  className="w-full h-7 text-xs"
                  title="Nur Löcher füllen"
                >
                  {isFilling ? (
                    <Loader2Icon className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Diamond className="h-3 w-3 mr-1.5" />
                  )}
                  Löcher füllen
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Export Section */}
        {postalCodesData && (
          <>
            <Separator />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                title="Als XLS exportieren"
                className="flex-1 h-7 text-xs"
              >
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                XLS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCSV}
                title="Als CSV kopieren"
                className="flex-1 h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </>
        )}

        {/* Layer Dialogs */}
        {areaId && (
          <>
            <ConflictResolutionDialog
              open={showConflicts}
              onOpenChange={setShowConflicts}
              areaId={areaId}
              layers={layers}
            />
            <VersionHistoryDialog
              open={showVersionHistory}
              onOpenChange={setShowVersionHistory}
              areaId={areaId}
            />
            <CreateVersionDialog
              open={showCreateVersion}
              onOpenChange={setShowCreateVersion}
              areaId={areaId}
              onVersionCreated={() => {
                // Optionally refresh layers or show success message
              }}
            />
            <LayerMergeDialog
              open={showLayerMerge}
              onOpenChange={setShowLayerMerge}
              areaId={areaId}
              layers={layers}
              onMergeComplete={() => {
                fetchLayers();
              }}
            />
          </>
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
