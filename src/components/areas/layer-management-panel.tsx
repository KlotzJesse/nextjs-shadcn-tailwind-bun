"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createLayerAction,
  updateLayerAction,
  getLayersAction,
  deleteLayerAction,
} from "@/app/actions/area-actions";
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconTrash,
  IconPalette,
  IconAlertTriangle,
  IconClock,
  IconDeviceFloppy,
  IconGitMerge,
} from "@tabler/icons-react";
import { useState, useEffect, useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { CreateVersionDialog } from "./create-version-dialog";
import { LayerMergeDialog } from "./layer-merge-dialog";
import { Separator } from "@/components/ui/separator";

interface LayerManagementPanelProps {
  areaId: number;
  activeLayerId: number | null;
  onLayerSelect: (layerId: number) => void;
}

// Define Layer type since it's no longer imported
interface Layer {
  id: number;
  areaId: number;
  name: string;
  color: string;
  opacity: number;
  isVisible: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  postalCodes?: { postalCode: string }[];
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

export function LayerManagementPanel({
  areaId,
  activeLayerId,
  onLayerSelect,
}: LayerManagementPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [newLayerName, setNewLayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [showLayerMerge, setShowLayerMerge] = useState(false);

  const fetchLayers = async () => {
    const result = await getLayersAction(areaId);
    if (result.success && result.data) {
      setLayers(result.data);
    }
  };

  useEffect(() => {
    if (areaId) {
      fetchLayers();
    }
  }, [areaId]);

  const handleCreateLayer = async () => {
    if (!newLayerName.trim()) return;

    setIsCreating(true);
    startTransition(async () => {
      try {
        const nextColor = DEFAULT_COLORS[layers.length % DEFAULT_COLORS.length];
        const result = await createLayerAction(areaId, {
          name: newLayerName,
          color: nextColor,
          opacity: 100,
          isVisible: true,
          orderIndex: layers.length,
        });

        if (result.success) {
          setNewLayerName("");
          await fetchLayers(); // Refresh layers
        }
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleColorChange = async (layerId: number, color: string) => {
    startTransition(async () => {
      const result = await updateLayerAction(areaId, layerId, { color });
      if (result.success) {
        await fetchLayers();
      }
    });
  };

  const handleOpacityChange = async (layerId: number, opacity: number) => {
    startTransition(async () => {
      const result = await updateLayerAction(areaId, layerId, { opacity });
      if (result.success) {
        await fetchLayers();
      }
    });
  };

  const handleToggleVisibility = async (layerId: number) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    startTransition(async () => {
      const result = await updateLayerAction(areaId, layerId, {
        isVisible: layer.isVisible === "true" ? false : true,
      });
      if (result.success) {
        await fetchLayers();
      }
    });
  };

  return (
    <Card className="w-72">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Layer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Action buttons - compact */}
        <div className="grid grid-cols-4 gap-1">
          <Button
            onClick={() => setShowConflicts(true)}
            variant="outline"
            size="sm"
            className="h-8 px-2"
            title="Konflikte auflösen"
          >
            <IconAlertTriangle className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setShowVersionHistory(true)}
            variant="outline"
            size="sm"
            className="h-8 px-2"
            title="Versionshistorie"
          >
            <IconClock className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setShowCreateVersion(true)}
            variant="outline"
            size="sm"
            className="h-8 px-2"
            title="Snapshot erstellen"
          >
            <IconDeviceFloppy className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setShowLayerMerge(true)}
            variant="outline"
            size="sm"
            className="h-8 px-2"
            title="Layer zusammenführen"
          >
            <IconGitMerge className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Create new layer - compact */}
        <div className="flex gap-1.5">
          <Input
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            placeholder="Neuer Layer..."
            className="h-8 text-sm"
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
            className="h-8 w-8"
          >
            <IconPlus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Layer list - compact */}
        <div className="space-y-1.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                activeLayerId === layer.id
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onLayerSelect(layer.id)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
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
                  className="h-5 w-5 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(layer.id);
                  }}
                >
                  {layer.isVisible === "true" ? (
                    <IconEye className="h-3 w-3" />
                  ) : (
                    <IconEyeOff className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Color and opacity controls - compact */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 px-1.5 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconPalette className="h-3 w-3 mr-1" />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: layer.color }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-2"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded border-2 border-transparent hover:border-primary"
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorChange(layer.id, color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div
                  className="flex items-center gap-1.5"
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
                  <span className="text-xs w-8 text-right flex-shrink-0">
                    {layer.opacity}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dialogs */}
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
            fetchLayers(); // Refresh layers after merge
          }}
        />
      </CardContent>
    </Card>
  );
}
