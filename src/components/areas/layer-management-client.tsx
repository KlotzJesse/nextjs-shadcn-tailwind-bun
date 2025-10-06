"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import {
  createLayerAction,
  updateLayerAction,
  deleteLayerAction,
  addPostalCodesToLayerAction,
  removePostalCodesFromLayerAction,
} from "@/app/actions/layer-actions";

interface Layer {
  id: number;
  name: string;
  color: string;
  opacity: number;
  isVisible: boolean;
  orderIndex: number;
  postalCodes: Array<{ postalCode: string }>;
}

interface LayerManagementClientProps {
  areaId: number;
  initialLayers: Layer[];
  activeLayerId: number | null;
}

export function LayerManagementClient({
  areaId,
  initialLayers,
  activeLayerId,
}: LayerManagementClientProps) {
  const [, setActiveLayerId] = useQueryState("activeLayerId", {
    defaultValue: null,
    parse: (value) => (value ? parseInt(value) : null),
  });

  const [isPending, startTransition] = useTransition();
  const [optimisticLayers, updateOptimisticLayers] = useOptimistic(
    initialLayers,
    (state, action: { type: string; payload: any }) => {
      switch (action.type) {
        case "create":
          return [...state, action.payload];
        case "update":
          return state.map((layer) =>
            layer.id === action.payload.id ? action.payload : layer
          );
        case "delete":
          return state.filter((layer) => layer.id !== action.payload);
        case "toggle-visibility":
          return state.map((layer) =>
            layer.id === action.payload
              ? { ...layer, isVisible: !layer.isVisible }
              : layer
          );
        default:
          return state;
      }
    }
  );

  const [editingLayerId, setEditingLayerId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteLayerId, setDeleteLayerId] = useState<number | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(true);

  const handleCreateLayer = () => {
    const newLayer = {
      id: Date.now(), // Temporary ID for optimistic update
      name: `Ebene ${optimisticLayers.length + 1}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      opacity: 60,
      isVisible: true,
      orderIndex: optimisticLayers.length,
      postalCodes: [],
    };

    updateOptimisticLayers({ type: "create", payload: newLayer });

    startTransition(async () => {
      const result = await createLayerAction(areaId, {
        name: newLayer.name,
        color: newLayer.color,
        opacity: newLayer.opacity,
        isVisible: newLayer.isVisible,
        orderIndex: newLayer.orderIndex,
      });

      if (result.success && result.data) {
        setActiveLayerId(result.data.id);
      }
    });
  };

  const handleToggleVisibility = (layerId: number) => {
    const layer = optimisticLayers.find((l) => l.id === layerId);
    if (!layer) return;

    updateOptimisticLayers({ type: "toggle-visibility", payload: layerId });

    startTransition(async () => {
      await updateLayerAction(areaId, layerId, {
        isVisible: !layer.isVisible,
      });
    });
  };

  const handleStartRename = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleConfirmRename = () => {
    if (!editingLayerId || !editingName.trim()) {
      setEditingLayerId(null);
      return;
    }

    const updatedLayer = optimisticLayers.find((l) => l.id === editingLayerId);
    if (!updatedLayer) return;

    updateOptimisticLayers({
      type: "update",
      payload: { ...updatedLayer, name: editingName.trim() },
    });

    startTransition(async () => {
      await updateLayerAction(areaId, editingLayerId, {
        name: editingName.trim(),
      });
    });

    setEditingLayerId(null);
  };

  const handleCancelRename = () => {
    setEditingLayerId(null);
    setEditingName("");
  };

  const handleConfirmDelete = () => {
    if (!deleteLayerId) return;

    updateOptimisticLayers({ type: "delete", payload: deleteLayerId });

    startTransition(async () => {
      await deleteLayerAction(areaId, deleteLayerId);
      if (activeLayerId === deleteLayerId) {
        setActiveLayerId(null);
      }
    });

    setDeleteLayerId(null);
  };

  const handleColorChange = (layerId: number, color: string) => {
    const layer = optimisticLayers.find((l) => l.id === layerId);
    if (!layer) return;

    updateOptimisticLayers({
      type: "update",
      payload: { ...layer, color },
    });

    startTransition(async () => {
      await updateLayerAction(areaId, layerId, { color });
    });
  };

  const handleOpacityChange = (layerId: number, opacity: number) => {
    const layer = optimisticLayers.find((l) => l.id === layerId);
    if (!layer) return;

    updateOptimisticLayers({
      type: "update",
      payload: { ...layer, opacity },
    });

    startTransition(async () => {
      await updateLayerAction(areaId, layerId, { opacity });
    });
  };

  const handleAddPostalCodes = (layerId: number, postalCodes: string[]) => {
    startTransition(async () => {
      await addPostalCodesToLayerAction(areaId, layerId, postalCodes);
    });
  };

  const handleRemovePostalCodes = (layerId: number, postalCodes: string[]) => {
    startTransition(async () => {
      await removePostalCodesFromLayerAction(areaId, layerId, postalCodes);
    });
  };

  return (
    <>
      <Collapsible open={isLayersOpen} onOpenChange={setIsLayersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-7 px-2 text-xs"
          >
            <span className="font-medium">Ebenen</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                isLayersOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-1">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {optimisticLayers.map((layer) => (
              <div
                key={layer.id}
                className={`p-2 rounded border ${
                  activeLayerId === layer.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                } ${isPending ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <div
                    className="w-3 h-3 rounded-sm border flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  {editingLayerId === layer.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename();
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      onBlur={handleConfirmRename}
                      className="h-6 px-1 text-xs flex-1"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setActiveLayerId(layer.id)}
                      onDoubleClick={() => handleStartRename(layer)}
                      className="text-xs flex-1 text-left truncate hover:text-primary"
                    >
                      {layer.name}
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(layer.id)}
                    className="h-6 w-6 p-0"
                    disabled={isPending}
                  >
                    {layer.isVisible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteLayerId(layer.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) =>
                      handleColorChange(layer.id, e.target.value)
                    }
                    className="w-6 h-5 rounded cursor-pointer"
                    disabled={isPending}
                  />
                  <Slider
                    value={[layer.opacity]}
                    onValueChange={([value]) =>
                      handleOpacityChange(layer.id, value)
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                    disabled={isPending}
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {layer.opacity}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {layer.postalCodes.length} PLZ
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateLayer}
            className="w-full h-7 text-xs gap-1"
            disabled={isPending}
          >
            <Plus className="h-3 w-3" />
            Neue Ebene
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog
        open={deleteLayerId !== null}
        onOpenChange={() => setDeleteLayerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ebene löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
