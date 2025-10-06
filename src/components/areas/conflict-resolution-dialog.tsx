"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLayerConflicts } from "@/lib/hooks/use-layer-conflicts";
import { useAreaLayers } from "@/lib/hooks/use-area-layers";
import { Layer } from "@/lib/hooks/use-areas";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: number;
  layers: Layer[];
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  areaId,
  layers,
}: ConflictResolutionDialogProps) {
  const { conflicts, detectConflicts } = useLayerConflicts(layers);
  const { updateLayer } = useAreaLayers(areaId);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(
    new Set()
  );
  const [resolutionStrategy, setResolutionStrategy] = useState<string>("");

  const handleDetect = () => {
    detectConflicts();
  };

  const handleResolve = async () => {
    if (!resolutionStrategy) return;

    const [action, targetLayerIdStr] = resolutionStrategy.split(":");
    const targetLayerId = parseInt(targetLayerIdStr, 10);

    for (const conflict of conflicts) {
      if (!selectedConflicts.has(conflict.postalCode)) continue;

      if (action === "keep") {
        // Remove postal code from all layers except target
        for (const layer of layers) {
          if (layer.id !== targetLayerId) {
            const currentCodes =
              layer.postalCodes?.map((pc) => pc.postalCode) || [];
            const newCodes = currentCodes.filter(
              (code) => code !== conflict.postalCode
            );
            if (currentCodes.length !== newCodes.length) {
              await updateLayer(layer.id, { postalCodes: newCodes });
            }
          }
        }
      } else if (action === "remove-all") {
        // Remove from all layers
        for (const layer of layers) {
          const currentCodes =
            layer.postalCodes?.map((pc) => pc.postalCode) || [];
          const newCodes = currentCodes.filter(
            (code) => code !== conflict.postalCode
          );
          if (currentCodes.length !== newCodes.length) {
            await updateLayer(layer.id, { postalCodes: newCodes });
          }
        }
      }
    }

    setSelectedConflicts(new Set());
    handleDetect(); // Refresh conflicts
  };

  const toggleConflict = (postalCode: string) => {
    const newSet = new Set(selectedConflicts);
    if (newSet.has(postalCode)) {
      newSet.delete(postalCode);
    } else {
      newSet.add(postalCode);
    }
    setSelectedConflicts(newSet);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konflikte auflösen</DialogTitle>
          <DialogDescription>
            Finden und beheben Sie überlappende Postleitzahlen in verschiedenen
            Layern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {conflicts.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <IconCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Keine Konflikte gefunden
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <IconAlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  {conflicts.length} Konflikt{conflicts.length !== 1 ? "e" : ""}{" "}
                  gefunden
                </span>
              </div>

              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.postalCode}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <Checkbox
                      checked={selectedConflicts.has(conflict.postalCode)}
                      onCheckedChange={() =>
                        toggleConflict(conflict.postalCode)
                      }
                    />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{conflict.postalCode}</div>
                      <div className="flex flex-wrap gap-1">
                        {conflict.layers.map((layer) => (
                          <Badge
                            key={layer.id}
                            style={{
                              backgroundColor: layer.color,
                              color: "#fff",
                            }}
                          >
                            {layer.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedConflicts.size > 0 && (
                <div className="space-y-2">
                  <Label>Auflösungsstrategie</Label>
                  <Select
                    value={resolutionStrategy}
                    onValueChange={setResolutionStrategy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Strategie wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {layers.map((layer) => (
                        <SelectItem key={layer.id} value={`keep:${layer.id}`}>
                          Behalten in: {layer.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="remove-all:0">
                        Aus allen Layern entfernen
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button onClick={handleDetect} variant="secondary">
            Neu scannen
          </Button>
          {selectedConflicts.size > 0 && (
            <Button onClick={handleResolve} disabled={!resolutionStrategy}>
              {selectedConflicts.size} Konflikt
              {selectedConflicts.size !== 1 ? "e" : ""} auflösen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
