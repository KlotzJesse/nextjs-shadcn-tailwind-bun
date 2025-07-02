import type { MapData } from "@/lib/types";
import { promises as fs } from "fs";

export async function getStatesData(): Promise<MapData> {
  try {
    // Read GeoJSON data from file system to avoid loading during compilation
    const filePath = process.cwd() + "/src/data/states/german-states.geojson";
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as MapData;
  } catch (error) {
    console.error("Error loading state GeoJSON:", error);
    throw error;
  }
}

// Server-side function to get states data with proper error handling
export async function getStatesDataServer(): Promise<MapData | null> {
  try {
    return await getStatesData();
  } catch (error) {
    console.error("Error in getStatesDataServer:", error);
    return null;
  }
}
