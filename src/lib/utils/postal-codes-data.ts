import { db } from "@/lib/db";
import type { MapData } from "@/lib/types/map-data";
import { sql } from "drizzle-orm";

// Fetch all postal codes for a given granularity from the Neon database as GeoJSON
export async function getPostalCodesDataForGranularity(granularity: string): Promise<MapData> {
  try {
    const { rows } = await db.execute(
      sql`SELECT id, code, granularity, ST_AsGeoJSON(geometry) as geometry, properties, bbox, "created_at", "updated_at" FROM postal_codes WHERE granularity = ${granularity}`
    );
    const features = rows.map((row: any) => ({
      type: "Feature" as const,
      properties: {
        id: row.id.toString(),
        code: row.code,
        granularity: row.granularity,
        ...(row.properties ?? {})
      },
      geometry: JSON.parse(row.geometry)
    }));
    return {
      type: "FeatureCollection",
      features
    };
  } catch (error) {
    console.error("Error fetching postal codes from Neon:", error);
    throw error;
  }
}

export async function getPostalCodesDataForGranularityServer(granularity: string): Promise<MapData | null> {
  try {
    return await getPostalCodesDataForGranularity(granularity);
  } catch (error) {
    console.error("Error in getPostalCodesDataForGranularityServer:", error);
    return null;
  }
}