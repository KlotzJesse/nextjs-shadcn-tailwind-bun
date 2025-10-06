import { useCallback, useEffect, useRef } from "react";
import { useAreaLayers } from "./use-area-layers";

const AUTOSAVE_DELAY = 2000; // 2 seconds

export function useAreaAutosave(areaId: number, activeLayerId: number | null) {
  const { updateLayer } = useAreaLayers(areaId);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Map<number, string[]>>(new Map());

  const scheduleAutosave = useCallback(
    (layerId: number, postalCodes: string[]) => {
      // Store pending changes
      pendingChangesRef.current.set(layerId, postalCodes);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(async () => {
        const changes = Array.from(pendingChangesRef.current.entries());
        pendingChangesRef.current.clear();

        // Save all pending changes
        for (const [lid, codes] of changes) {
          try {
            await updateLayer(lid, { postalCodes: codes });
          } catch (error) {
            console.error("Autosave failed:", error);
          }
        }
      }, AUTOSAVE_DELAY);
    },
    [updateLayer]
  );

  const cancelAutosave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingChangesRef.current.clear();
  }, []);

  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const changes = Array.from(pendingChangesRef.current.entries());
    pendingChangesRef.current.clear();

    for (const [lid, codes] of changes) {
      try {
        await updateLayer(lid, { postalCodes: codes });
      } catch (error) {
        console.error("Force save failed:", error);
      }
    }
  }, [updateLayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    scheduleAutosave,
    cancelAutosave,
    forceSave,
  };
}
