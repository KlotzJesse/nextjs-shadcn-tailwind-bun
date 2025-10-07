"use client";

import { useState, useEffect, useCallback } from "react";
import {
  undoChangeAction,
  redoChangeAction,
  getUndoRedoStatusAction,
} from "@/app/actions/change-tracking-actions";
import { toast } from "sonner";

interface UndoRedoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export function useUndoRedo(areaId: number | null) {
  const [status, setStatus] = useState<UndoRedoStatus>({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!areaId) {
      setStatus({ canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 });
      return;
    }

    try {
      const result = await getUndoRedoStatusAction(areaId);
      if (result.success && result.data) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error("Error fetching undo/redo status:", error);
    }
  }, [areaId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Separate effect for polling to avoid dependency issues
  useEffect(() => {
    if (!areaId) return;
    
    const interval = setInterval(() => {
      refreshStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [areaId, refreshStatus]);

  const undo = useCallback(async () => {
    if (!areaId || !status.canUndo || isLoading) return;

    setIsLoading(true);
    try {
      const result = await undoChangeAction(areaId);
      
      if (result.success) {
        toast.success("Änderung rückgängig gemacht");
        // Refresh status immediately
        setTimeout(() => refreshStatus(), 100);
      } else {
        toast.error(result.error || "Fehler beim Rückgängigmachen");
      }
    } catch (error) {
      console.error("Error undoing change:", error);
      toast.error("Fehler beim Rückgängigmachen");
    } finally {
      setIsLoading(false);
    }
  }, [areaId, status.canUndo, isLoading, refreshStatus]);

  const redo = useCallback(async () => {
    if (!areaId || !status.canRedo || isLoading) return;

    setIsLoading(true);
    try {
      const result = await redoChangeAction(areaId);
      
      if (result.success) {
        toast.success("Änderung wiederhergestellt");
        // Refresh status immediately
        setTimeout(() => refreshStatus(), 100);
      } else {
        toast.error(result.error || "Fehler beim Wiederherstellen");
      }
    } catch (error) {
      console.error("Error redoing change:", error);
      toast.error("Fehler beim Wiederherstellen");
    } finally {
      setIsLoading(false);
    }
  }, [areaId, status.canRedo, isLoading, refreshStatus]);

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
    refreshStatus,
  };
}