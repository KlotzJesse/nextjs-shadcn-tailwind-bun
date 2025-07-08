import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/geoprocess
// Body: { mode: 'all' | 'holes' | 'expand', granularity: string, selectedCodes: string[] }
export async function POST(req: NextRequest) {
  try {
    const { mode, granularity, selectedCodes } = await req.json();
    if (!mode || !granularity || !Array.isArray(selectedCodes)) {
      console.log("Missing parameters:", {
        mode,
        granularity,
        selectedCodes,
      });
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Fetch all postal codes for the granularity

    // Prepare selected and unselected sets

    // Build SQL for geoprocessing
    let resultCodes: string[] = [];
    if (mode === "expand") {
      // Find unselected regions adjacent to selected
      let expandRows = [];
      if (selectedCodes.length > 0) {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity} AND code NOT IN (${sql.raw(
            selectedCodes.map(String).join(",")
          )}) AND ST_Touches(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE code IN (${sql.raw(
            selectedCodes.map(String).join(",")
          )}))`
        );
        expandRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity}`
        );
        expandRows = rows;
      }
      resultCodes = expandRows.map((r) =>
        String((r as Record<string, unknown>)["code"])
      );
    } else if (mode === "holes") {
      // Use a CTE for the convex hull to avoid recomputation and maximize performance
      if (selectedCodes.length > 0) {
        // Always treat codes as strings for SQL
        const codeList = selectedCodes.map((code) => `'${String(code)}'`).join(",");
        const { rows } = await db.execute(
          sql`WITH hull AS (
            SELECT ST_ConvexHull(ST_Collect(geometry)) AS geom
            FROM postal_codes
            WHERE granularity = ${granularity} AND code IN (${sql.raw(codeList)})
          )
          SELECT code FROM postal_codes, hull
          WHERE granularity = ${granularity}
            AND code NOT IN (${sql.raw(codeList)})
            AND ST_Within(geometry, hull.geom)`
        );
        resultCodes = rows.map((r: Record<string, unknown>) => String(r.code));
      } else {
        resultCodes = [];
      }
      // For best performance, run ANALYZE postal_codes; after large data changes.
    } else if (mode === "all") {
      // Find all unselected regions that intersect the selected union
      let gapRows = [];
      if (selectedCodes.length > 0) {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity} AND code NOT IN (${sql.raw(
            selectedCodes.map(String).join(",")
          )}) AND ST_Intersects(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE code IN (${sql.raw(
            selectedCodes.map(String).join(",")
          )}))`
        );
        gapRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity}`
        );
        gapRows = rows;
      }
      resultCodes = gapRows.map((r) =>
        String((r as Record<string, unknown>)["code"])
      );
    }

    return NextResponse.json({ resultCodes });
  } catch (error) {
    console.error("Geoprocessing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
