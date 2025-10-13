"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  undoChangeAction,
  redoChangeAction,
} from "@/app/actions/change-tracking-actions";
import { toast } from "sonner";

interface UndoRedoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

interface UseUndoRedoOptions {
  onOptimisticUndo?: () => void;
  onOptimisticRedo?: () => void;
}

export function useUndoRedo(
  areaId: number | null,
  initialStatus?: UndoRedoStatus,
  onStatusUpdate?: () => void,
  options?: UseUndoRedoOptions
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const undo = useCallback(async () => {
    if (!areaId || !initialStatus?.canUndo || isLoading) return;

    setIsLoading(true);

    startTransition(async () => {
      // Optimistic update
      options?.onOptimisticUndo?.();

      try {
        const result = await undoChangeAction(areaId);

        if (result.success) {
          toast.success("Änderung rückgängig gemacht");
          // Trigger revalidation to update status
          onStatusUpdate?.();
        } else {
          toast.error(result.error || "Fehler beim Rückgängigmachen");
        }
      } catch (error) {
        console.error("Error undoing change:", error);
        toast.error("Fehler beim Rückgängigmachen");
      } finally {
        setIsLoading(false);
      }
    });
  }, [areaId, initialStatus?.canUndo, isLoading, onStatusUpdate, options]);

  const redo = useCallback(async () => {
    if (!areaId || !initialStatus?.canRedo || isLoading) return;

    setIsLoading(true);

    startTransition(async () => {
      // Optimistic update
      options?.onOptimisticRedo?.();

      try {
        const result = await redoChangeAction(areaId);

        if (result.success) {
          toast.success("Änderung wiederhergestellt");
          // Trigger revalidation to update status
          onStatusUpdate?.();
        } else {
          toast.error(result.error || "Fehler beim Wiederherstellen");
        }
      } catch (error) {
        console.error("Error redoing change:", error);
        toast.error("Fehler beim Wiederherstellen");
      } finally {
        setIsLoading(false);
      }
    });
  }, [areaId, initialStatus?.canRedo, isLoading, onStatusUpdate, options]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y or Cmd+Y for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    canUndo: initialStatus?.canUndo,
    canRedo: initialStatus?.canRedo,
    undoCount: initialStatus?.undoCount,
    redoCount: initialStatus?.redoCount,
    undo,
    redo,
    isLoading,
    isPending,
  };
}
