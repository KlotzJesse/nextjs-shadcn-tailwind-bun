import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Layer, PostalCodeEntry } from "./use-areas";

export interface CreateLayerData {
  areaId: number;
  name: string;
  color?: string;
  opacity?: number;
  isVisible?: string;
  orderIndex?: number;
  postalCodes?: string[];
}

export interface UpdateLayerData {
  name?: string;
  color?: string;
  opacity?: number;
  isVisible?: string;
  orderIndex?: number;
  postalCodes?: string[];
}

export function useAreaLayers(areaId: number) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLayers = useCallback(async () => {
    if (!areaId || areaId <= 0) {
      console.log("[useAreaLayers] No valid areaId, skipping fetch:", areaId);
      setLayers([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log("[useAreaLayers] Fetching layers for area:", areaId);
      const response = await fetch(`/api/areas/${areaId}/layers`);
      if (!response.ok) {
        throw new Error("Failed to fetch layers");
      }
      const data = await response.json();
      console.log("[useAreaLayers] Fetched layers:", data?.length || 0);
      setLayers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("[useAreaLayers] Fetch error:", err);
      setError(errorMessage);
      toast.error("Fehler beim Laden der Layer");
    } finally {
      setIsLoading(false);
    }
  }, [areaId]);

  const createLayer = useCallback(
    async (data: Omit<CreateLayerData, "areaId">) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/areas/${areaId}/layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, areaId }),
        });
        if (!response.ok) {
          throw new Error("Failed to create layer");
        }
        const result = await response.json();
        await fetchLayers(); // Refresh list
        toast.success("Layer erfolgreich erstellt");
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast.error("Fehler beim Erstellen des Layers");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [areaId, fetchLayers]
  );

  const updateLayer = useCallback(
    async (layerId: number, data: UpdateLayerData) => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(
          "[updateLayer] Updating layer:",
          layerId,
          "with data:",
          data
        );
        const response = await fetch(`/api/areas/${areaId}/layers/${layerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "[updateLayer] Response not ok:",
            response.status,
            errorText
          );
          throw new Error("Failed to update layer");
        }
        const result = await response.json();
        console.log("[updateLayer] Update successful:", result);
        await fetchLayers(); // Refresh list
        console.log("[updateLayer] Layers refreshed");
        toast.success("Layer aktualisiert");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("[updateLayer] Error:", err);
        setError(errorMessage);
        toast.error("Fehler beim Aktualisieren des Layers");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [areaId, fetchLayers]
  );

  const addPostalCodesToLayer = useCallback(
    async (layerId: number, postalCodes: string[]) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) {
        console.warn("[addPostalCodesToLayer] Layer not found:", layerId);
        return;
      }

      const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
      const newCodes = [...new Set([...existingCodes, ...postalCodes])];

      console.log(
        "[addPostalCodesToLayer] Before:",
        existingCodes,
        "After:",
        newCodes,
        "Adding:",
        postalCodes
      );

      // Only update if there are actually new codes
      if (newCodes.length === existingCodes.length) {
        console.log(
          "[addPostalCodesToLayer] No new codes to add, skipping update"
        );
        toast.info(`PLZ bereits im Layer vorhanden`);
        return;
      }

      await updateLayer(layerId, { postalCodes: newCodes });
    },
    [layers, updateLayer]
  );

  const removePostalCodesFromLayer = useCallback(
    async (layerId: number, postalCodes: string[]) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
      const newCodes = existingCodes.filter(
        (code) => !postalCodes.includes(code)
      );

      await updateLayer(layerId, { postalCodes: newCodes });
    },
    [layers, updateLayer]
  );

  const toggleLayerVisibility = useCallback(
    async (layerId: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const newVisibility = layer.isVisible === "true" ? "false" : "true";
      await updateLayer(layerId, { isVisible: newVisibility });
    },
    [layers, updateLayer]
  );

  const updateLayerColor = useCallback(
    async (layerId: number, color: string) => {
      await updateLayer(layerId, { color });
    },
    [updateLayer]
  );

  const deleteLayer = useCallback(
    async (layerId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/areas/${areaId}/layers/${layerId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete layer");
        }
        await fetchLayers(); // Refresh list
        toast.success("Layer gelöscht");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast.error("Fehler beim Löschen des Layers");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [areaId, fetchLayers]
  );

  return {
    layers,
    isLoading,
    error,
    fetchLayers,
    createLayer,
    updateLayer,
    deleteLayer,
    addPostalCodesToLayer,
    removePostalCodesFromLayer,
    toggleLayerVisibility,
    updateLayerColor,
  };
}
