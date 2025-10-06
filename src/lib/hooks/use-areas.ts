import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface Area {
  id: number;
  name: string;
  description: string | null;
  granularity: string;
  isArchived: string;
  createdAt: string;
  updatedAt: string;
}

export interface AreaWithLayers extends Area {
  layers: Layer[];
}

export interface Layer {
  id: number;
  areaId: number;
  name: string;
  color: string;
  opacity: number;
  isVisible: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  postalCodes?: PostalCodeEntry[];
}

export interface PostalCodeEntry {
  id: number;
  layerId: number;
  postalCode: string;
  createdAt: string;
}

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/areas");
      if (!response.ok) {
        throw new Error("Failed to fetch areas");
      }
      const data = await response.json();
      setAreas(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error("Fehler beim Laden der Gebiete");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createArea = useCallback(
    async (data: {
      name: string;
      description?: string;
      granularity?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/areas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error("Failed to create area");
        }
        const result = await response.json();
        await fetchAreas(); // Refresh list
        toast.success("Gebiet erfolgreich erstellt");
        return result.area;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast.error("Fehler beim Erstellen des Gebiets");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAreas]
  );

  const updateArea = useCallback(
    async (
      id: number,
      data: {
        name?: string;
        description?: string;
        granularity?: string;
        isArchived?: string;
      }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/areas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error("Failed to update area");
        }
        await fetchAreas(); // Refresh list
        toast.success("Gebiet aktualisiert");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast.error("Fehler beim Aktualisieren des Gebiets");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAreas]
  );

  const deleteArea = useCallback(
    async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/areas/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete area");
        }
        await fetchAreas(); // Refresh list
        toast.success("Gebiet archiviert");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast.error("Fehler beim Archivieren des Gebiets");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAreas]
  );

  const getArea = useCallback(async (id: number): Promise<AreaWithLayers> => {
    const response = await fetch(`/api/areas/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch area");
    }
    return response.json();
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  return {
    areas,
    isLoading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    deleteArea,
    getArea,
  };
}
