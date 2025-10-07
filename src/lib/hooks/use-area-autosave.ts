import { useCallback, useEffect, useRef } from "react";
import { updateLayerAction } from "@/app/actions/area-actions";

const AUTOSAVE_DELAY = 2000; // 2 seconds

export function useAreaAutosave(areaId: number, activeLayerId: number | null) {
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
            await updateLayerAction(areaId, lid, { postalCodes: codes });
          } catch (error) {
            console.error("Autosave failed:", error);
          }
        }
      }, AUTOSAVE_DELAY);
    },
    [areaId]
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
        await updateLayerAction(areaId, lid, { postalCodes: codes });
      } catch (error) {
        console.error("Force save failed:", error);
      }
    }
  }, [areaId]);

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
