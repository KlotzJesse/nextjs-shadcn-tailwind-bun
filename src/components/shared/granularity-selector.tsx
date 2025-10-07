"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { type Layer } from "@/lib/hooks/use-areas";
import { AlertTriangle, Info, Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateAreaAction } from "@/app/actions/area-actions";
import { changeAreaGranularityAction } from "@/app/actions/granularity-actions";
import {
  GRANULARITY_OPTIONS,
  getGranularityLabel,
  isGranularityChangeCompatible,
  wouldGranularityChangeCauseDataLoss,
  getGranularityChangeDescription,
} from "@/lib/utils/granularity-utils";

interface GranularitySelectorProps {
  currentGranularity: string;
  onGranularityChange: (granularity: string) => void;
  areaId?: number;
  layers?: Layer[];
  isViewingVersion?: boolean;
}

export function GranularitySelector({
  currentGranularity,
  onGranularityChange,
  areaId,
  layers = [],
  isViewingVersion = false,
}: GranularitySelectorProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingGranularity, setPendingGranularity] = useState<string | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Check if area has any postal codes
  const hasPostalCodes = layers.some(
    (layer) => layer.postalCodes && layer.postalCodes.length > 0
  );

  // Get total postal codes count
  const totalPostalCodes = layers.reduce(
    (total, layer) => total + (layer.postalCodes?.length || 0),
    0
  );

  const handleGranularitySelect = (newGranularity: string) => {
    if (newGranularity === currentGranularity) return;

    // If no area selected, just call the callback to refresh with new granularity
    if (!areaId) {
      const newLabel = getGranularityLabel(newGranularity);
      toast.success(`Wechsel zu ${newLabel} PLZ-Ansicht`, {
        description: "Die Seite wird aktualisiert...",
        duration: 2000,
      });
      onGranularityChange(newGranularity);
      router.refresh();
      return;
    }

    // If viewing a version, inform but still allow the change (updates current area)
    if (isViewingVersion) {
      toast.info("Granularität wird für den aktuellen Bereich aktualisiert", {
        description: "Die Version wird nicht geändert",
        duration: 3000,
      });
    }

    // If no postal codes, allow any change
    if (!hasPostalCodes) {
      startTransition(async () => {
        try {
          const result = await changeAreaGranularityAction(
            areaId,
            newGranularity,
            currentGranularity
          );

          if (result.success) {
            const newLabel = getGranularityLabel(newGranularity);
            toast.success(`Wechsel zu ${newLabel} erfolgreich`, {
              description: "Die Seite wird aktualisiert...",
              duration: 3000,
            });
            router.refresh();
            onGranularityChange(newGranularity);
          } else {
            toast.error(result.error || "Fehler beim Ändern der Granularität");
          }
        } catch (error) {
          console.error("Error changing granularity:", error);
          toast.error("Fehler beim Ändern der Granularität");
        }
      });
      return;
    }

    // Check if change would cause data loss
    if (
      wouldGranularityChangeCauseDataLoss(
        currentGranularity,
        newGranularity,
        hasPostalCodes
      )
    ) {
      setPendingGranularity(newGranularity);
      setShowConfirmDialog(true);
      return;
    }

    // If compatible change (upgrade), show info and proceed with migration
    if (isGranularityChangeCompatible(currentGranularity, newGranularity)) {
      startTransition(async () => {
        try {
          const result = await changeAreaGranularityAction(
            areaId,
            newGranularity,
            currentGranularity
          );

          if (result.success && result.data) {
            const newLabel = getGranularityLabel(newGranularity);
            const { addedPostalCodes, migratedLayers } = result.data;
            
            toast.success(`Wechsel zu ${newLabel} PLZ-Ansicht`, {
              description: `${migratedLayers} Layer migriert, ${addedPostalCodes} Regionen hinzugefügt`,
              duration: 4000,
            });
            router.refresh();
            onGranularityChange(newGranularity);
          } else {
            toast.error(result.error || "Fehler beim Ändern der Granularität");
          }
        } catch (error) {
          console.error("Error changing granularity:", error);
          toast.error("Fehler beim Ändern der Granularität");
        }
      });
      return;
    }

    // Fallback
    toast.error("Unerwarteter Fehler beim Ändern der Granularität");
  };

  const handleConfirmChange = async () => {
    if (!pendingGranularity || !areaId) {
      setShowConfirmDialog(false);
      setPendingGranularity(null);
      return;
    }

    const newLabel = getGranularityLabel(pendingGranularity);

    startTransition(async () => {
      try {
        const result = await changeAreaGranularityAction(
          areaId,
          pendingGranularity,
          currentGranularity
        );

        if (result.success && result.data) {
          const { removedPostalCodes } = result.data;
          
          toast.success(`Wechsel zu ${newLabel} erfolgreich`, {
            description: `${removedPostalCodes} Regionen entfernt. Die Seite wird aktualisiert...`,
            duration: 3000,
          });
          
          // Refresh the page to load new granularity data
          router.refresh();
          
          // Call the callback for any additional handling
          onGranularityChange(pendingGranularity);
        } else {
          toast.error(result.error || "Fehler beim Ändern der Granularität");
        }
      } catch (error) {
        console.error("Error changing granularity:", error);
        toast.error("Fehler beim Ändern der Granularität");
      }

      setShowConfirmDialog(false);
      setPendingGranularity(null);
    });
  };

  const getSelectItemStatus = (optionValue: string) => {
    if (optionValue === currentGranularity) return "current";
    if (!hasPostalCodes) return "available";

    const changeDescription = getGranularityChangeDescription(
      currentGranularity,
      optionValue,
      totalPostalCodes
    );

    return changeDescription.type === "destructive"
      ? "destructive"
      : changeDescription.type === "compatible"
      ? "compatible"
      : "available";
  };

  const getSelectItemTooltip = (optionValue: string, status: string) => {
    const changeDescription = getGranularityChangeDescription(
      currentGranularity,
      optionValue,
      totalPostalCodes
    );

    return changeDescription.description;
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Granularity Selector */}
        <Select
          value={currentGranularity}
          onValueChange={handleGranularitySelect}
          disabled={isPending}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Granularität wählen" />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((option) => {
              const status = getSelectItemStatus(option.value);
              const tooltip = getSelectItemTooltip(option.value, status);

              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <SelectItem
                      value={option.value}
                      className={`
                        ${status === "current" ? "bg-accent" : ""}
                        ${status === "destructive" ? "text-destructive" : ""}
                        ${status === "compatible" ? "text-green-600" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <div className="flex items-center gap-1 ml-2">
                          {status === "current" && (
                            <Badge variant="secondary" className="text-xs px-1">
                              Aktiv
                            </Badge>
                          )}
                          {status === "destructive" && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                          {status === "compatible" && (
                            <Info className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </SelectContent>
        </Select>

        {/* Status Information */}
        {hasPostalCodes && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-1 mb-1">
              <Lock className="h-3 w-3" />
              <span className="font-medium">
                Gebiet hat {totalPostalCodes} Regionen
              </span>
            </div>
            <p>
              Wechsel zu höherer Granularität (→) ist kompatibel. Wechsel zu
              niedrigerer Granularität (←) löscht alle Regionen.
            </p>
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Granularität ändern?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <div>
                  <strong>Achtung:</strong> Der Wechsel zu einer niedrigeren
                  Granularität wird
                  <span className="text-destructive font-medium">
                    {" "}
                    alle {totalPostalCodes} Regionen
                  </span>{" "}
                  aus allen Gebieten löschen.
                </div>
                <div>
                  Die PLZ-Daten auf der Karte bleiben erhalten, aber Ihre
                  gespeicherten Gebietsauswahlen gehen verloren.
                </div>
                <div className="text-sm text-muted-foreground">
                  Dieser Vorgang kann nicht rückgängig gemacht werden.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingGranularity(null);
                }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmChange}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Trotzdem wechseln
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
