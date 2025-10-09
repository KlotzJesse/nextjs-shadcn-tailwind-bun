import { useCallback } from "react";
import { toast } from "sonner";
import {
  createVersionAction,
  restoreVersionAction,
} from "@/app/actions/version-actions";

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
        const result = await createVersionAction(areaId, data);
        if (result.success && result.data) {
          toast.success(`Version ${result.data.versionNumber} erstellt`);
          return result.data;
        } else {
          throw new Error(result.error || "Failed to create version");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Fehler beim Erstellen der Version: ${errorMessage}`);
        throw error;
      }
    },
    [areaId]
  );


  const restoreVersion = useCallback(
    async (version: AreaVersion) => {
      try {
        toast.promise(
          (async () => {
            const result = await restoreVersionAction(areaId, version.id);
            if (result.success) {
              return `Version ${version.versionNumber} wiederhergestellt`;
            } else {
              throw new Error(result.error || "Failed to restore version");
            }
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
    restoreVersion,
  };
}