import type { Geometry } from 'geojson';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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

export function useRadiusSearch({ onRadiusComplete }: UseRadiusSearchOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<RadiusSearchResult | null>(null);

  const performRadiusSearch = useCallback(async (
    coordinates: [number, number],
    radius: number,
    granularity: string
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/radius-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates,
          radius,
          granularity,
        }),
      });

      if (!response.ok) {
        throw new Error('Radius search failed');
      }

      const result: RadiusSearchResult = await response.json();
      setLastSearchResult(result);

      const postalCodes = result.postalCodes.map(pc => pc.code);

      if (onRadiusComplete) {
        onRadiusComplete(postalCodes);
      }

      toast.success(`Found ${result.count} postal codes within ${radius}km`);

      return result;
    } catch (error) {
      console.error('Radius search error:', error);
      toast.error('Failed to search postal codes by radius');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onRadiusComplete]);

  const clearLastSearch = useCallback(() => {
    setLastSearchResult(null);
  }, []);

  return {
    performRadiusSearch,
    isLoading,
    lastSearchResult,
    clearLastSearch,
  };
}
