import type { MapData } from "@/lib/types/map-data"

const STATE_GEOJSON_URL = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/4_niedrig.geo.json";

export async function getStatesData(): Promise<MapData> {
  try {
    const response = await fetch(STATE_GEOJSON_URL, { 
      next: { 
        revalidate: 3600, // Cache for 1 hour
        tags: ['states-data'] // Tag for cache invalidation
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch state GeoJSON data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as MapData;
  } catch (error) {
    console.error('Error fetching state GeoJSON:', error);
    throw error;
  }
}

// Server-side function to get states data with proper error handling
export async function getStatesDataServer(): Promise<MapData | null> {
  try {
    return await getStatesData();
  } catch (error) {
    console.error('Error in getStatesDataServer:', error);
    return null;
  }
} 