import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the request schema for validation
const RadiusRequestSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  radius: z.number().min(0.1).max(100), // radius in kilometers
  granularity: z.enum(['1digit', '2digit', '3digit', '5digit']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coordinates, radius, granularity } = RadiusRequestSchema.parse(body);

    const [longitude, latitude] = coordinates;

    // Convert radius from kilometers to meters for PostGIS
    const radiusMeters = radius * 1000;

    // Use ST_DWithin to find postal codes within the specified radius
    const { rows } = await db.execute(
      sql`
        SELECT
          code,
          ST_AsGeoJSON(geometry) as geometry,
          ST_Distance(
            ST_Transform(geometry, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
          ) as distance
        FROM postal_codes
        WHERE granularity = ${granularity}
        AND ST_DWithin(
          ST_Transform(geometry, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857),
          ${radiusMeters}
        )
        ORDER BY distance
      `
    );

    const postalCodes = rows.map(row => {
      const typedRow = row as { code: string; geometry: string; distance: number };
      return {
        code: typedRow.code,
        geometry: JSON.parse(typedRow.geometry),
        distance: Math.round(typedRow.distance), // distance in meters
      };
    });

    return NextResponse.json({
      center: coordinates,
      radius,
      granularity,
      postalCodes,
      count: postalCodes.length,
    });
  } catch (error) {
    console.error('Radius search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius');
  const granularity = searchParams.get('granularity');

  if (!lat || !lon || !radius || !granularity) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lon, radius, granularity' },
      { status: 400 }
    );
  }

  try {
    const parsedData = RadiusRequestSchema.parse({
      coordinates: [parseFloat(lon), parseFloat(lat)],
      radius: parseFloat(radius),
      granularity,
    });

    // Use the same logic as POST
    const [longitude, latitude] = parsedData.coordinates;
    const radiusMeters = parsedData.radius * 1000;

    const { rows } = await db.execute(
      sql`
        SELECT
          code,
          ST_AsGeoJSON(geometry) as geometry,
          ST_Distance(
            ST_Transform(geometry, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
          ) as distance
        FROM postal_codes
        WHERE granularity = ${parsedData.granularity}
        AND ST_DWithin(
          ST_Transform(geometry, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857),
          ${radiusMeters}
        )
        ORDER BY distance
      `
    );

    const postalCodes = rows.map(row => {
      const typedRow = row as { code: string; geometry: string; distance: number };
      return {
        code: typedRow.code,
        geometry: JSON.parse(typedRow.geometry),
        distance: Math.round(typedRow.distance),
      };
    });

    return NextResponse.json({
      center: parsedData.coordinates,
      radius: parsedData.radius,
      granularity: parsedData.granularity,
      postalCodes,
      count: postalCodes.length,
    });
  } catch (error) {
    console.error('Radius search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
