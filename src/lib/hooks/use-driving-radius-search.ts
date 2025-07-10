import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import type { Geometry } from "geojson";
import { useState } from "react";
import { toast } from "sonner";

interface DrivingRadiusSearchResult {
  center: [number, number];
  radius: number;
  granularity: string;
  mode: "distance" | "time";
  method: "osrm" | "approximation";
  fellBackToApproximation?: boolean;
  postalCodes: {
    code: string;
    geometry: Geometry;
    distance: number; // driving distance in km
    duration: number; // driving time in minutes
  }[];
  count: number;
}

interface UseDrivingRadiusSearchOptions {
  onRadiusComplete?: (postalCodes: string[]) => void;
}

export function useDrivingRadiusSearch({
  onRadiusComplete,
}: UseDrivingRadiusSearchOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchResult, setLastSearchResult] =
    useState<DrivingRadiusSearchResult | null>(null);

  const performDrivingRadiusSearch = useStableCallback(
    async (
      coordinates: [number, number],
      radius: number,
      granularity: string,
      mode: "distance" | "time" = "distance",
      method: "osrm" | "approximation" = "approximation"
    ) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/driving-radius-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates,
            radius,
            granularity,
            mode,
            method,
          }),
        });

        if (!response.ok) {
          throw new Error("Driving radius search failed");
        }

        const result: DrivingRadiusSearchResult = await response.json();
        setLastSearchResult(result);

        const postalCodes = result.postalCodes.map((pc) => pc.code);

        if (onRadiusComplete) {
          onRadiusComplete(postalCodes);
        }

        // Show fallback warning if OSRM failed
        if (result.fellBackToApproximation) {
          toast.warning(
            "⚠️ Präzisionsmodus nicht verfügbar - Schätzung verwendet",
            {
              description:
                "Die exakte Routenberechnung ist temporär nicht verfügbar. Es wurde eine hochwertige Schätzung verwendet.",
            }
          );
        }

        return result;
      } catch (error) {
        console.error("Driving radius search error:", error);
        // Don't show error toast here - let promise toast handle it
        throw error; // Re-throw for promise toast handling
      } finally {
        setIsLoading(false);
      }
    }
  );

  const clearLastSearch = useStableCallback(() => {
    setLastSearchResult(null);
  });

  return {
    performDrivingRadiusSearch,
    isLoading,
    lastSearchResult,
    clearLastSearch,
  };
}
