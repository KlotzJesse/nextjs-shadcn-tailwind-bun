import { useCallback } from "react";
import { toast } from "sonner";

export interface AreaVersion {
  id: number;
  areaId: number;
  versionNumber: number;
  name: string | null;
  description: string | null;
  snapshot: {
    areaName: string;
    granularity: string;
    layers: {
      id: number;
      name: string;
      color: string;
      opacity: number;
      isVisible: string;
      orderIndex: number;
      postalCodes: string[];
    }[];
  };
  changesSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

export function useVersionHistory(areaId: number) {
  const createVersion = useCallback(
    async (data: {
      name?: string;
      description?: string;
      changesSummary?: string;
      createdBy?: string;
    }) => {
      try {
        const response = await fetch(`/api/areas/${areaId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to create version");
        }

        const version = await response.json();
        toast.success(`Version ${version.versionNumber} erstellt`);
        return version;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Fehler beim Erstellen der Version: ${errorMessage}`);
        throw error;
      }
    },
    [areaId]
  );

  const getVersionHistory = useCallback(async (): Promise<AreaVersion[]> => {
    try {
      const response = await fetch(`/api/areas/${areaId}/versions`);
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      return response.json();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Fehler beim Laden der Versionen: ${errorMessage}`);
      throw error;
    }
  }, [areaId]);

  const restoreVersion = useCallback(
    async (version: AreaVersion) => {
      try {
        // Restore layers from version snapshot
        const { layers: snapshotLayers } = version.snapshot;

        // This would need to be implemented by:
        // 1. Delete all current layers
        // 2. Recreate layers from snapshot
        // For now, we'll just show the structure

        toast.promise(
          (async () => {
            // Fetch current area
            const areaResponse = await fetch(`/api/areas/${areaId}`);
            const area = await areaResponse.json();

            // Delete all current layers
            for (const layer of area.layers) {
              await fetch(`/api/areas/${areaId}/layers/${layer.id}`, {
                method: "DELETE",
              });
            }

            // Recreate layers from snapshot
            for (const snapshotLayer of snapshotLayers) {
              await fetch(`/api/areas/${areaId}/layers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: snapshotLayer.name,
                  color: snapshotLayer.color,
                  opacity: snapshotLayer.opacity,
                  isVisible: snapshotLayer.isVisible,
                  orderIndex: snapshotLayer.orderIndex,
                  postalCodes: snapshotLayer.postalCodes,
                }),
              });
            }

            return `Version ${version.versionNumber} wiederhergestellt`;
          })(),
          {
            loading: "Wiederherstellen...",
            success: (message) => message,
            error: "Fehler beim Wiederherstellen",
          }
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Fehler beim Wiederherstellen: ${errorMessage}`);
        throw error;
      }
    },
    [areaId]
  );

  return {
    createVersion,
    getVersionHistory,
    restoreVersion,
  };
}
