import type { Geometry } from "geojson";
import { useState } from "react";
import { toast } from "sonner";
import { useStableCallback } from "./use-stable-callback";

interface RadiusSearchResult {
  center: [number, number];
  radius: number;
  granularity: string;
  postalCodes: {
    code: string;
    geometry: Geometry;
    distance: number;
  }[];
  count: number;
}

interface UseRadiusSearchOptions {
  onRadiusComplete?: (postalCodes: string[]) => void;
}

export function useRadiusSearch({
  onRadiusComplete,
}: UseRadiusSearchOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchResult, setLastSearchResult] =
    useState<RadiusSearchResult | null>(null);

  const performRadiusSearch = useStableCallback(
    async (
      coordinates: [number, number],
      radius: number,
      granularity: string
    ) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/radius-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates,
            radius,
            granularity,
          }),
        });

        if (!response.ok) {
          throw new Error("Radius search failed");
        }

        const result: RadiusSearchResult = await response.json();
        setLastSearchResult(result);

        const postalCodes = result.postalCodes.map((pc) => pc.code);

        if (onRadiusComplete) {
          onRadiusComplete(postalCodes);
        }

        toast.success(`${result.count} PLZ innerhalb ${radius}km gefunden`);

        return result;
      } catch (error) {
        console.error("Radius search error:", error);
        toast.error("PLZ-Umkreissuche fehlgeschlagen");
        return null;
      } finally {
        setIsLoading(false);
      }
    }
  );

  const clearLastSearch = useStableCallback(() => {
    setLastSearchResult(null);
  });

  return {
    performRadiusSearch,
    isLoading,
    lastSearchResult,
    clearLastSearch,
  };
}
