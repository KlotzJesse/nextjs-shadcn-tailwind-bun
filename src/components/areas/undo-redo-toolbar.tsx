"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { cn } from "@/lib/utils";

interface UndoRedoToolbarProps {
  areaId: number | null;
  className?: string;
  variant?: "default" | "floating";
  initialStatus?: {
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
  };
  onStatusUpdate?: () => void;
}

export function UndoRedoToolbar({
  areaId,
  className,
  variant = "default",
  initialStatus,
  onStatusUpdate,
}: UndoRedoToolbarProps) {
  const { undo, redo, isLoading } = useUndoRedo(
    areaId,
    initialStatus,
    onStatusUpdate
  );

  if (!areaId) return null;

  const isFloating = variant === "floating";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-1",
          isFloating &&
            "bg-white/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 pointer-events-auto",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              onClick={undo}
              disabled={!initialStatus?.canUndo || isLoading}
              className="gap-2"
            >
              <IconArrowBackUp className="h-4 w-4" />
              Rückgängig
              {initialStatus!.undoCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({initialStatus?.undoCount})
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Letzte Änderung rückgängig machen (Strg+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              onClick={redo}
              disabled={!initialStatus?.canRedo || isLoading}
              className="gap-2"
            >
              <IconArrowForwardUp className="h-4 w-4" />
              Wiederholen
              {initialStatus!.redoCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({initialStatus?.redoCount})
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Letzte rückgängig gemachte Änderung wiederholen (Strg+Umschalt+Z
              oder Strg+Y)
            </p>
          </TooltipContent>
        </Tooltip>

        {isLoading && (
          <div className="ml-2 flex items-center text-xs text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
            Verarbeitung...
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
