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
}

export function UndoRedoToolbar({
  areaId,
  className,
  variant = "default",
}: UndoRedoToolbarProps) {
  const { canUndo, canRedo, undoCount, redoCount, undo, redo, isLoading } =
    useUndoRedo(areaId);

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
              disabled={!canUndo || isLoading}
              className="gap-2"
            >
              <IconArrowBackUp className="h-4 w-4" />
              Undo
              {undoCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({undoCount})
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo last change (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              onClick={redo}
              disabled={!canRedo || isLoading}
              className="gap-2"
            >
              <IconArrowForwardUp className="h-4 w-4" />
              Redo
              {redoCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({redoCount})
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo last undone change (Ctrl+Shift+Z or Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        {isLoading && (
          <div className="ml-2 flex items-center text-xs text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
            Processing...
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
