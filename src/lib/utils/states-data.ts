import { db } from "@/lib/db";
import type { MapData } from "@/lib/types/map-data";
import { sql } from "drizzle-orm";

export async function getStatesData(): Promise<MapData> {
  try {
    // Select all columns, but geometry as GeoJSON
    const { rows } = await db.execute(
      sql`SELECT id, name, code, ST_AsGeoJSON(geometry) as geometry, properties, bbox, "created_at", "updated_at" FROM states`
    );
    const features = rows.map((row: any) => ({
      type: "Feature" as const,
      properties: {
        id: row.id.toString(),
        code: row.code,
        name: row.name,
        ...(row.properties ?? {})
      },
      geometry: JSON.parse(row.geometry)
    }));
    return {
      type: "FeatureCollection",
      features
    };
  } catch (error) {
    console.error("Error fetching states from Neon:", error);
    throw error;
  }
}

export async function getStatesDataServer(): Promise<MapData | null> {
  try {
    return await getStatesData();
  } catch (error) {
    console.error("Error in getStatesDataServer:", error);
    return null;
  }
}