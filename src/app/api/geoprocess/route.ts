import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/geoprocess
// Body: { mode: 'all' | 'holes' | 'expand', granularity: string, selectedIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const { mode, granularity, selectedIds } = await req.json();
    if (!mode || !granularity || !Array.isArray(selectedIds)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch all postal codes for the granularity
    const { rows } = await db.execute(
      sql`SELECT id, code, geometry FROM postal_codes WHERE granularity = ${granularity}`
    );

    // Prepare selected and unselected sets

    // Build SQL for geoprocessing
    let resultIds: string[] = [];
    if (mode === 'expand') {
      // Find unselected regions adjacent to selected
      let expandRows = [];
      if (selectedIds.length > 0) {
        // If IDs are numeric, join as-is. If string, wrap in single quotes and escape.
        const idList = selectedIds.map(id => isNaN(Number(id)) ? `'${String(id).replace(/'/g, "''")}'` : id).join(', ');
        const sqlString = `SELECT id FROM postal_codes WHERE granularity = '${granularity}' AND id NOT IN (${idList}) AND ST_Touches(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE id IN (${idList})))`;
        const { rows } = await db.execute(sqlString);
        expandRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT id FROM postal_codes WHERE granularity = ${granularity}`
        );
        expandRows = rows;
      }
      resultIds = expandRows.map((r: any) => String(r.id));
    } else if (mode === 'holes') {
      // Find holes (regions not reachable from edge)
      // For now, return empty (implementing full flood fill in SQL is complex)
      resultIds = [];
    } else if (mode === 'all') {
      // Find all unselected regions that intersect the selected union
      let gapRows = [];
      if (selectedIds.length > 0) {
        const idList = selectedIds.map(id => isNaN(Number(id)) ? `'${String(id).replace(/'/g, "''")}'` : id).join(', ');
        const sqlString = `SELECT id FROM postal_codes WHERE granularity = '${granularity}' AND id NOT IN (${idList}) AND ST_Intersects(geometry, (SELECT ST_Union(geometry) AS geom FROM postal_codes WHERE id IN (${idList})))`;
        const { rows } = await db.execute(sqlString);
        gapRows = rows;
      } else {
        const { rows } = await db.execute(
          sql`SELECT id FROM postal_codes WHERE granularity = ${granularity}`
        );
        gapRows = rows;
      }
      resultIds = gapRows.map((r: any) => String(r.id));
    }

    return NextResponse.json({ resultIds });
  } catch (error) {
    console.error('Geoprocessing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
