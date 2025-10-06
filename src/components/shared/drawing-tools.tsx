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
import { type Area, type Layer } from "@/lib/hooks/use-areas";
import {
  createLayerAction,
  updateLayerAction,
  deleteLayerAction,
  addPostalCodesToLayerAction,
  removePostalCodesFromLayerAction,
} from "@/app/actions/area-actions";
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

export interface DrawingToolsProps {
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
  // Layer data and operations passed from server
  layers?: Layer[];
  onLayerUpdate?: () => void; // Callback to refresh layer data
  addPostalCodesToLayer?: (layerId: number, codes: string[]) => Promise<void>;
  removePostalCodesFromLayer?: (
    layerId: number,
    codes: string[]
  ) => Promise<void>;
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
  activeLayer: any,
  addPostalCodesToLayer: (layerId: number, codes: string[]) => Promise<void>,
  setIsFilling: (b: boolean) => void,
  granularity?: string
) {
  if (!granularity) {
    toast.error("Granularität ist erforderlich für die Geoverarbeitung");
    return;
  }

  if (!activeLayer) {
    toast.error("Bitte wählen Sie einen aktiven Layer aus");
    return;
  }

  const fillPromise = async () => {
    setIsFilling(true);

    try {
      const layerCodes =
        activeLayer.postalCodes?.map((pc: any) => pc.postalCode) || [];

      console.log(
        "Filling regions with mode:",
        mode,
        "granularity:",
        granularity,
        "layer codes:",
        layerCodes
      );

      // Use server action instead of client-side fetch
      const { geoprocessAction } = await import("@/app/actions/area-actions");
      const result = await geoprocessAction({
        mode,
        granularity,
        selectedCodes: layerCodes,
      });

      if (!result.success) {
        throw new Error(
          result.error || "Server-Geoverarbeitung fehlgeschlagen"
        );
      }

      const resultCodes = result.data?.resultCodes || [];
      if (resultCodes && resultCodes.length > 0) {
        await addPostalCodesToLayer(activeLayer.id, resultCodes);
      }

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
  layers = [],
  onLayerUpdate,
  addPostalCodesToLayer,
  removePostalCodesFromLayer,
}: DrawingToolsProps) {
  // Collapsible section states
  const [toolsOpen, setToolsOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(areaId ? true : false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Layer management state
  const [newLayerName, setNewLayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<number | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");
  const [showConflicts, setShowConflicts] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showLayerMerge, setShowLayerMerge] = useState(false);

  // Server action implementations
  const createLayer = async (data: {
    name: string;
    color: string;
    orderIndex: number;
  }) => {
    if (!areaId) return;
    const result = await createLayerAction({ areaId, ...data });
    if (result.success) {
      onLayerUpdate?.();
      return result.data;
    }
    throw new Error(result.error);
  };

  const updateLayer = async (layerId: number, data: any) => {
    const result = await updateLayerAction(layerId, data);
    if (result.success) {
      onLayerUpdate?.();
    } else {
      throw new Error(result.error);
    }
  };

  const deleteLayer = async (layerId: number) => {
    const result = await deleteLayerAction(layerId);
    if (result.success) {
      onLayerUpdate?.();
    } else {
      throw new Error(result.error);
    }
  };

  const toggleLayerVisibility = async (layerId: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newVisibility = layer.isVisible === "true" ? "false" : "true";
    await updateLayer(layerId, { isVisible: newVisibility });
  };

  const updateLayerColor = async (layerId: number, color: string) => {
    await updateLayer(layerId, { color });
  };

  // Create handlers for adding/removing pending postal codes to/from active layer
  const handleAddPendingToLayer = async () => {
    console.log("[handleAddPendingToLayer] Called with:", {
      areaId,
      activeLayerId,
      pendingCount: pendingPostalCodes.length,
      addFunction: !!addPostalCodesToLayer,
    });

    if (
      !areaId ||
      !activeLayerId ||
      !addPostalCodesToLayer ||
      pendingPostalCodes.length === 0
    ) {
      if (!areaId || !activeLayerId) {
        toast.warning("Bitte wählen Sie einen aktiven Layer aus", {
          duration: 3000,
        });
      } else if (pendingPostalCodes.length === 0) {
        toast.info("Keine Regionen zum Hinzufügen gefunden", {
          duration: 2000,
        });
      } else if (!addPostalCodesToLayer) {
        toast.error("Layer-Funktion nicht verfügbar", { duration: 2000 });
      }
      return;
    }

    try {
      console.log(
        "[handleAddPendingToLayer] Adding codes:",
        pendingPostalCodes
      );
      await addPostalCodesToLayer(activeLayerId, pendingPostalCodes);
      toast.success(
        `${pendingPostalCodes.length} Region${
          pendingPostalCodes.length === 1 ? "" : "en"
        } zu Layer hinzugefügt`,
        { duration: 2000 }
      );
      // Call the original onAddPending to clear the pending codes
      onAddPending?.();
    } catch (error) {
      console.error("Error adding pending codes to layer:", error);
      toast.error("Fehler beim Hinzufügen der Regionen", { duration: 2000 });
    }
  };

  const handleRemovePendingFromLayer = async () => {
    console.log("[handleRemovePendingFromLayer] Called with:", {
      areaId,
      activeLayerId,
      pendingCount: pendingPostalCodes.length,
      removeFunction: !!removePostalCodesFromLayer,
    });

    if (
      !areaId ||
      !activeLayerId ||
      !removePostalCodesFromLayer ||
      pendingPostalCodes.length === 0
    ) {
      if (!areaId || !activeLayerId) {
        toast.warning("Bitte wählen Sie einen aktiven Layer aus", {
          duration: 3000,
        });
      } else if (pendingPostalCodes.length === 0) {
        toast.info("Keine Regionen zum Entfernen gefunden", { duration: 2000 });
      } else if (!removePostalCodesFromLayer) {
        toast.error("Layer-Funktion nicht verfügbar", { duration: 2000 });
      }
      return;
    }

    try {
      console.log(
        "[handleRemovePendingFromLayer] Removing codes:",
        pendingPostalCodes
      );
      await removePostalCodesFromLayer(activeLayerId, pendingPostalCodes);
      toast.success(
        `${pendingPostalCodes.length} Region${
          pendingPostalCodes.length === 1 ? "" : "en"
        } aus Layer entfernt`,
        { duration: 2000 }
      );
      // Call the original onRemovePending to clear the pending codes
      onRemovePending?.();
    } catch (error) {
      console.error("Error removing pending codes from layer:", error);
      toast.error("Fehler beim Entfernen der Regionen", { duration: 2000 });
    }
  };

  useEffect(() => {
    // Layer data now comes from props passed by server component
    if (areaId) {
      console.log(
        "Drawing tools area changed to:",
        areaId,
        "- layers provided via props:",
        layers.length
      );
    }
  }, [areaId, layers.length]);

  // Map drawing mode IDs to TerraDrawModes
  const drawingModeToTerraDrawMode = (modeId: string): TerraDrawMode | null => {
    switch (modeId) {
      case "cursor":
        return "select";
      case "freehand":
        return "freehand";
      case "circle":
        return "circle";
      case "rectangle":
        return "rectangle";
      case "polygon":
        return "polygon";
      default:
        return null;
    }
  };

  // Map TerraDrawMode back to drawing mode ID for UI state
  const terraDrawModeToDrawingMode = (
    mode: TerraDrawMode | null
  ): string | null => {
    switch (mode) {
      case "select":
        return "cursor";
      case "freehand":
        return "freehand";
      case "circle":
        return "circle";
      case "rectangle":
        return "rectangle";
      case "polygon":
        return "polygon";
      default:
        return null;
    }
  };

  const handleModeClick = (modeId: string) => {
    const terraDrawMode = drawingModeToTerraDrawMode(modeId);
    if (currentMode === terraDrawMode) {
      // Deactivate current mode
      onModeChange(null);
      const modeInfo = drawingModes.find((m) => m.id === modeId);
      toast.success(`🖱️ ${modeInfo?.name || "Werkzeug"} deaktiviert`, {
        duration: 2000,
      });
    } else {
      // Activate new mode
      onModeChange(terraDrawMode);
      const modeInfo = drawingModes.find((m) => m.id === modeId);
      toast.success(`🎯 ${modeInfo?.name || "Werkzeug"} aktiviert`, {
        description: modeInfo?.description,
        duration: 3000,
      });
    }
  };

  const allModes = drawingModes;

  // Helper: get all postal codes from active layer, prepending D-
  const getPostalCodes = () => {
    if (!activeLayerId) return [];
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return [];
    const codes = activeLayer.postalCodes?.map((pc) => pc.postalCode) || [];
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
      const result = await createLayer({
        name: newLayerName,
        color: nextColor,
        orderIndex: layers.length,
      });
      setNewLayerName("");

      // Set the newly created layer as active
      if (result?.id && onLayerSelect) {
        onLayerSelect(result.id);
      }
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

  const handleDeleteLayer = async (layerId: number) => {
    if (!deleteLayer) return;
    if (!confirm("Möchten Sie diesen Layer wirklich löschen?")) return;

    try {
      await deleteLayer(layerId);
      toast.success("Layer gelöscht");
    } catch (error) {
      // Error already handled by hook
    }
  };

  const handleRenameLayer = async (layerId: number, newName: string) => {
    if (!newName.trim()) {
      toast.error("Layer-Name darf nicht leer sein");
      return;
    }

    try {
      await updateLayer(layerId, { name: newName.trim() });
      setEditingLayerId(null);
      setEditingLayerName("");
      toast.success("Layer umbenannt");
    } catch (error) {
      // Error already handled by hook
    }
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
                          {editingLayerId === layer.id ? (
                            <Input
                              value={editingLayerName}
                              onChange={(e) =>
                                setEditingLayerName(e.target.value)
                              }
                              className="h-5 text-xs flex-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") {
                                  handleRenameLayer(layer.id, editingLayerName);
                                } else if (e.key === "Escape") {
                                  setEditingLayerId(null);
                                  setEditingLayerName("");
                                }
                              }}
                              onBlur={() => {
                                if (editingLayerName.trim()) {
                                  handleRenameLayer(layer.id, editingLayerName);
                                } else {
                                  setEditingLayerId(null);
                                  setEditingLayerName("");
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="font-medium text-xs truncate cursor-text"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerId(layer.id);
                                setEditingLayerName(layer.name);
                              }}
                              title="Doppelklick zum Umbenennen"
                            >
                              {layer.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({layer.postalCodes?.length || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                            title={
                              layer.isVisible === "true"
                                ? "Ausblenden"
                                : "Einblenden"
                            }
                          >
                            {layer.isVisible === "true" ? (
                              <IconEye className="h-2.5 w-2.5" />
                            ) : (
                              <IconEyeOff className="h-2.5 w-2.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 flex-shrink-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer(layer.id);
                            }}
                            title="Layer löschen"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
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
                const isActive =
                  terraDrawModeToDrawingMode(currentMode) === mode.id;
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
              <span>Regionen ({pendingPostalCodes.length})</span>
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
                    onClick={handleAddPendingToLayer}
                    className="h-6 text-xs"
                    title="Gefundene zum aktiven Layer hinzufügen"
                    disabled={
                      !areaId || !activeLayerId || !addPostalCodesToLayer
                    }
                  >
                    Hinzufügen
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemovePendingFromLayer}
                    className="h-6 text-xs"
                    title="Gefundene aus aktivem Layer entfernen"
                    disabled={
                      !areaId || !activeLayerId || !removePostalCodesFromLayer
                    }
                  >
                    Entfernen
                  </Button>
                </div>
                <Separator />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Actions Section */}
        {currentMode && currentMode !== "select" && (
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
                {currentMode && currentMode !== "select" && (
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
                {activeLayerId && areaId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      isFilling || !layers.find((l) => l.id === activeLayerId)
                    }
                    onClick={() => {
                      const activeLayer = layers.find(
                        (l) => l.id === activeLayerId
                      );
                      if (postalCodesData && activeLayer) {
                        fillRegions(
                          "holes",
                          postalCodesData,
                          activeLayer,
                          addPostalCodesToLayer,
                          setIsFilling,
                          granularity
                        );
                      }
                    }}
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
                )}
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
                onLayerUpdate?.();
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
