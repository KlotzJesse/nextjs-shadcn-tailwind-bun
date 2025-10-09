"use client";

import { useState, useEffect, useCallback } from "react";
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

export function useUndoRedo(areaId: number | null, initialStatus?: UndoRedoStatus, onStatusUpdate?: () => void) {
  const [status, setStatus] = useState<UndoRedoStatus>(
    initialStatus || {
      canUndo: false,
      canRedo: false,
      undoCount: 0,
      redoCount: 0,
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to update status (can be called from parent components)
  const updateStatus = useCallback((newStatus: UndoRedoStatus) => {
    setStatus(newStatus);
  }, []);

  // Listen for storage events to refresh when changes are made in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'undo-redo-refresh' && areaId) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [areaId]);


  const undo = useCallback(async () => {
    if (!areaId || !status.canUndo || isLoading) return;

    setIsLoading(true);
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
  }, [areaId, status.canUndo, isLoading, onStatusUpdate]);

  const redo = useCallback(async () => {
    if (!areaId || !status.canRedo || isLoading) return;

    setIsLoading(true);
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
  }, [areaId, status.canRedo, isLoading, onStatusUpdate]);

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
    canUndo: status.canUndo,
    canRedo: status.canRedo,
    undoCount: status.undoCount,
    redoCount: status.redoCount,
    undo,
    redo,
    isLoading,
    updateStatus,
  };
}