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
        // Always treat codes as strings
        const codeList = selectedCodes
          .map((code) => `'${String(code).replace(/'/g, "''")}'`)
          .join(", ");
        const sqlString = `SELECT code FROM postal_codes WHERE granularity = '${granularity}' AND code NOT IN (${codeList}) AND ST_Touches(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE code IN (${codeList})))`;
        const { rows } = await db.execute(sqlString);
        expandRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity}`
        );
        expandRows = rows;
      }
      resultCodes = expandRows.map((r: any) => String(r.code));
    } else if (mode === "holes") {
      // Find holes (regions not reachable from edge)
      // For now, return empty (implementing full flood fill in SQL is complex)
      resultCodes = [];
    } else if (mode === "all") {
      // Find all unselected regions that intersect the selected union
      let gapRows = [];
      if (selectedCodes.length > 0) {
        const codeList = selectedCodes
          .map((code) => `'${String(code).replace(/'/g, "''")}'`)
          .join(", ");
        const sqlString = `SELECT code FROM postal_codes WHERE granularity = '${granularity}' AND code NOT IN (${codeList}) AND ST_Intersects(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE code IN (${codeList})))`;
        const { rows } = await db.execute(sqlString);
        gapRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT code FROM postal_codes WHERE granularity = ${granularity}`
        );
        gapRows = rows;
      }
      resultCodes = gapRows.map((r: any) => String(r.code));
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
