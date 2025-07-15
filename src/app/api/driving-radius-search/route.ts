import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema for validation
const DrivingRadiusRequestSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  radius: z.number().min(0.1).max(200), // radius in kilometers or minutes
  granularity: z.enum(["1digit", "2digit", "3digit", "5digit"]),
  mode: z.enum(["distance", "time"]), // distance in km or time in minutes
  method: z.enum(["osrm", "approximation"]).optional(), // routing method
});

interface OSRMTableResponse {
  durations?: number[][];
  distances?: number[][];
  code: string;
}

// OSRM public demo instance (free to use)
const OSRM_BASE_URL = "https://router.project-osrm.org";

// Enhanced approximation factors for driving vs crow-flies distance (based on German road network analysis)
const DRIVING_DISTANCE_FACTOR = 1.25; // German roads: ~25% longer than crow-flies (optimized for accuracy)

// Enhanced speed calculation based on German road network characteristics
const CITY_SPEED_KMH = 45; // Realistic city driving speed (including traffic lights, zones)
const SUBURBAN_SPEED_KMH = 65; // Suburban areas speed
const HIGHWAY_SPEED_KMH = 110; // Realistic highway speed (considering traffic, construction)
const RURAL_SPEED_KMH = 80; // Rural roads speed

const OSRM_BATCH_SIZE = 80; // Max coordinates per OSRM request to avoid 414 errors

// Enhanced speed calculation based on distance and German driving patterns
function calculateAverageSpeed(distanceKm: number): number {
  // Very short distances (< 5km): predominantly city driving with stops
  if (distanceKm < 5) {
    return CITY_SPEED_KMH * 0.9; // Account for frequent stops, traffic lights
  }

  // Short distances (5-15km): mixed city/suburban with some arterial roads
  if (distanceKm < 15) {
    const cityWeight = Math.max(0.4, 1 - (distanceKm - 5) / 10);
    const suburbanWeight = 1 - cityWeight;
    return CITY_SPEED_KMH * cityWeight + SUBURBAN_SPEED_KMH * suburbanWeight;
  }

  // Medium distances (15-40km): suburban to rural transition, some highway access
  if (distanceKm < 40) {
    const suburbanWeight = Math.max(0.3, 1 - (distanceKm - 15) / 25);
    const ruralWeight = Math.min(0.4, (distanceKm - 15) / 25);
    const highwayWeight = 1 - suburbanWeight - ruralWeight;
    return (
      SUBURBAN_SPEED_KMH * suburbanWeight +
      RURAL_SPEED_KMH * ruralWeight +
      HIGHWAY_SPEED_KMH * highwayWeight
    );
  }

  // Long distances (40-100km): predominantly highway with rural connectors
  if (distanceKm < 100) {
    const ruralWeight = Math.max(0.2, 1 - (distanceKm - 40) / 60);
    const highwayWeight = 1 - ruralWeight;
    return RURAL_SPEED_KMH * ruralWeight + HIGHWAY_SPEED_KMH * highwayWeight;
  }

  // Very long distances (100km+): mostly highway driving
  const highwayWeight = Math.min(0.95, 0.7 + (distanceKm - 100) / 500);
  const ruralWeight = 1 - highwayWeight;
  return RURAL_SPEED_KMH * ruralWeight + HIGHWAY_SPEED_KMH * highwayWeight;
}

async function getPostalCodeCentroids(
  granularity: string,
  center: [number, number],
  radiusKm: number,
  maxCount: number = 1000
) {
  // Pre-filter with a larger straight-line radius to reduce API calls
  // Use 1.5x the requested radius to account for driving route variations
  const preFilterRadius = radiusKm * 1.5;

  const { rows } = await db.execute(
    sql`
      SELECT
        code,
        ST_X(ST_Centroid(geometry)) as lon,
        ST_Y(ST_Centroid(geometry)) as lat,
        ST_AsGeoJSON(geometry) as geometry,
        ST_Distance(
          ST_Transform(ST_SetSRID(ST_Point(${center[0]}, ${
      center[1]
    }), 4326), 3857),
          ST_Transform(ST_Centroid(geometry), 3857)
        ) / 1000 as distance_km
      FROM postal_codes
      WHERE granularity = ${granularity}
        AND ST_DWithin(
          ST_Transform(ST_SetSRID(ST_Point(${center[0]}, ${
      center[1]
    }), 4326), 3857),
          ST_Transform(ST_Centroid(geometry), 3857),
          ${preFilterRadius * 1000}
        )
      ORDER BY distance_km
      LIMIT ${maxCount}
    `
  );

  return rows.map((row) => {
    const typedRow = row as {
      code: string;
      lon: number;
      lat: number;
      geometry: string;
      distance_km: number;
    };
    return {
      code: typedRow.code,
      coordinates: [typedRow.lon, typedRow.lat] as [number, number],
      geometry: JSON.parse(typedRow.geometry),
      straightLineDistance: typedRow.distance_km,
    };
  });
}

async function calculateDrivingDistancesOSRM(
  origin: [number, number],
  destinations: [number, number][]
): Promise<{ distances: number[]; durations: number[] }> {
  const allDistances: number[] = [];
  const allDurations: number[] = [];

  // Process destinations in batches to avoid OSRM 414 errors
  for (let i = 0; i < destinations.length; i += OSRM_BATCH_SIZE) {
    const batch = destinations.slice(i, i + OSRM_BATCH_SIZE);

    // OSRM expects longitude,latitude format
    const coords = [origin, ...batch]
      .map((coord) => `${coord[0]},${coord[1]}`)
      .join(";");

    const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?sources=0&annotations=distance,duration`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "KRAUSS-Territory-Management/1.0",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(
          `OSRM API error: ${response.status} - ${response.statusText}`
        );
      }

      const data: OSRMTableResponse = await response.json();

      if (data.code !== "Ok" || !data.distances || !data.durations) {
        throw new Error(`OSRM API returned: ${data.code || "invalid data"}`);
      }

      // Convert distances from meters to kilometers and durations from seconds to minutes
      const batchDistances = data.distances[0].slice(1).map((d) => d / 1000);
      const batchDurations = data.durations[0].slice(1).map((d) => d / 60);

      allDistances.push(...batchDistances);
      allDurations.push(...batchDurations);

      // Add small delay between batches to be respectful to the free OSRM service
      if (i + OSRM_BATCH_SIZE < destinations.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`OSRM batch ${i}-${i + batch.length} error:`, error);
      throw error;
    }
  }

  return {
    distances: allDistances,
    durations: allDurations,
  };
}

function calculateApproximateDistances(
  origin: [number, number],
  destinations: [number, number][]
): { distances: number[]; durations: number[] } {
  const distances = destinations.map((dest) => {
    // Haversine formula for crow-flies distance
    const [lon1, lat1] = origin;
    const [lon2, lat2] = dest;

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const crowFliesDistance = R * c;

    // Apply driving distance factor for German road network
    return crowFliesDistance * DRIVING_DISTANCE_FACTOR;
  });

  const durations = distances.map((distance) => {
    // Use smart average speed calculation based on distance
    const avgSpeed = calculateAverageSpeed(distance);
    return (distance / avgSpeed) * 60; // Convert hours to minutes
  });

  return { distances, durations };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      coordinates,
      radius,
      granularity,
      mode,
      method = "approximation",
    } = DrivingRadiusRequestSchema.parse(body);

    console.log(
      `Driving radius search: ${radius}${
        mode === "time" ? "min" : "km"
      } ${mode} from [${coordinates}] using ${method}`
    );

    // Get postal code centroids within a pre-filtered area
    const postalCodes = await getPostalCodeCentroids(
      granularity,
      coordinates,
      radius
    );

    console.log(
      `Found ${postalCodes.length} postal codes within pre-filter radius`
    );

    if (postalCodes.length === 0) {
      return NextResponse.json({
        center: coordinates,
        radius,
        granularity,
        mode,
        method,
        postalCodes: [],
        count: 0,
      });
    }

    // Calculate driving distances/times - default to OSRM for best accuracy
    let results: { distances: number[]; durations: number[] };
    let actualMethod = method;
    let fellBackToApproximation = false;

    try {
      if (method === "osrm" || method === undefined) {
        console.log(
          `Processing ${postalCodes.length} destinations with OSRM in batches of ${OSRM_BATCH_SIZE}`
        );
        results = await calculateDrivingDistancesOSRM(
          coordinates,
          postalCodes.map((pc) => pc.coordinates)
        );
        actualMethod = "osrm";
      } else {
        console.log(
          `Processing ${postalCodes.length} destinations with approximation method`
        );
        results = calculateApproximateDistances(
          coordinates,
          postalCodes.map((pc) => pc.coordinates)
        );
        actualMethod = "approximation";
      }
    } catch (error) {
      console.warn("OSRM failed, falling back to approximation method:", error);
      // Fallback to approximation if OSRM fails
      results = calculateApproximateDistances(
        coordinates,
        postalCodes.map((pc) => pc.coordinates)
      );
      actualMethod = "approximation";
      fellBackToApproximation = true;
    }

    // Filter based on mode (distance or time) and radius
    const filteredPostalCodes = postalCodes
      .map((pc, index) => ({
        code: pc.code,
        geometry: pc.geometry,
        distance: results.distances[index],
        duration: results.durations[index],
        straightLineDistance: pc.straightLineDistance,
      }))
      .filter((pc) => {
        const value = mode === "distance" ? pc.distance : pc.duration;
        return value <= radius;
      })
      .sort((a, b) => {
        const valueA = mode === "distance" ? a.distance : a.duration;
        const valueB = mode === "distance" ? b.distance : b.duration;
        return valueA - valueB;
      });

    console.log(
      `Filtered to ${filteredPostalCodes.length} postal codes within ${radius}${
        mode === "time" ? "min" : "km"
      } ${mode}`
    );

    return NextResponse.json({
      center: coordinates,
      radius,
      granularity,
      mode,
      method: actualMethod,
      fellBackToApproximation,
      postalCodes: filteredPostalCodes,
      count: filteredPostalCodes.length,
    });
  } catch (error) {
    console.error("Driving radius search error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius");
  const granularity = searchParams.get("granularity");
  const mode = searchParams.get("mode") || "distance";
  const method = searchParams.get("method") || "approximation";

  if (!lat || !lon || !radius || !granularity) {
    return NextResponse.json(
      { error: "Missing required parameters: lat, lon, radius, granularity" },
      { status: 400 }
    );
  }

  try {
    const parsedData = DrivingRadiusRequestSchema.parse({
      coordinates: [parseFloat(lon), parseFloat(lat)],
      radius: parseFloat(radius),
      granularity,
      mode,
      method,
    });

    // Use the same logic as POST
    return POST(
      new NextRequest(request.url, {
        method: "POST",
        body: JSON.stringify(parsedData),
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (error) {
    console.error("GET driving radius search error:", error);
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
}
