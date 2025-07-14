import { ApiError, withApiErrorHandling } from "@/lib/utils/api-error-handling";
import { normalizeCityStateName } from "@/lib/utils/postal-code-parser";
import { db } from "@/lib/db";
import { postalCodes } from "@/lib/schema/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema for validation
const LocationSearchRequestSchema = z.object({
  location: z.string().min(2, "Location name must be at least 2 characters"),
  granularity: z.enum(["1digit", "2digit", "3digit", "5digit"]).default("5digit"),
  limit: z.number().max(100).default(50),
});

async function postHandler(request: NextRequest) {
  const body = await request.json();
  const { location, granularity, limit } = LocationSearchRequestSchema.parse(body);

  // Get search variants for the location
  const searchVariants = normalizeCityStateName(location);

  // Search in database using property fields
  const searchConditions = searchVariants.map(variant => 
    sql`properties->>'name' ILIKE ${`%${variant}%`} OR 
        properties->>'city' ILIKE ${`%${variant}%`} OR 
        properties->>'stadt' ILIKE ${`%${variant}%`} OR 
        properties->>'state' ILIKE ${`%${variant}%`} OR 
        properties->>'bundesland' ILIKE ${`%${variant}%`} OR 
        properties->>'region' ILIKE ${`%${variant}%`} OR 
        properties->>'ort' ILIKE ${`%${variant}%`} OR 
        properties->>'gemeinde' ILIKE ${`%${variant}%`}`
  );

  const whereCondition = sql`(${searchConditions.reduce((acc, condition, index) => 
    index === 0 ? condition : sql`${acc} OR ${condition}`
  )}) AND granularity = ${granularity}`;

  const results = await db
    .select({
      code: postalCodes.code,
      granularity: postalCodes.granularity,
      geometry: postalCodes.geometry,
      properties: postalCodes.properties,
    })
    .from(postalCodes)
    .where(whereCondition)
    .limit(limit);

  // Also try to search with geometric data if available
  const geoJsonResults = results.map(result => ({
    type: "Feature" as const,
    properties: {
      code: result.code,
      granularity: result.granularity,
      ...(result.properties as object || {}),
    },
    geometry: result.geometry,
  }));

  return NextResponse.json({
    location: location,
    searchVariants: searchVariants,
    granularity: granularity,
    postalCodes: results.map(r => r.code),
    count: results.length,
    features: geoJsonResults,
  });
}

async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  const granularity = (searchParams.get("granularity") || "5digit") as "1digit" | "2digit" | "3digit" | "5digit";
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!location) {
    throw new ApiError(400, "Location parameter is required", "Missing Parameter");
  }

  LocationSearchRequestSchema.parse({
    location,
    granularity,
    limit,
  });

  // Get search variants for the location
  const searchVariants = normalizeCityStateName(location);

  // Search in database using property fields
  const searchConditions = searchVariants.map(variant => 
    sql`properties->>'name' ILIKE ${`%${variant}%`} OR 
        properties->>'city' ILIKE ${`%${variant}%`} OR 
        properties->>'stadt' ILIKE ${`%${variant}%`} OR 
        properties->>'state' ILIKE ${`%${variant}%`} OR 
        properties->>'bundesland' ILIKE ${`%${variant}%`} OR 
        properties->>'region' ILIKE ${`%${variant}%`} OR 
        properties->>'ort' ILIKE ${`%${variant}%`} OR 
        properties->>'gemeinde' ILIKE ${`%${variant}%`}`
  );

  const whereCondition = sql`(${searchConditions.reduce((acc, condition, index) => 
    index === 0 ? condition : sql`${acc} OR ${condition}`
  )}) AND granularity = ${granularity}`;

  const results = await db
    .select({
      code: postalCodes.code,
      granularity: postalCodes.granularity,
      geometry: postalCodes.geometry,
      properties: postalCodes.properties,
    })
    .from(postalCodes)
    .where(whereCondition)
    .limit(limit);

  // Also try to search with geometric data if available
  const geoJsonResults = results.map(result => ({
    type: "Feature" as const,
    properties: {
      code: result.code,
      granularity: result.granularity,
      ...(result.properties as object || {}),
    },
    geometry: result.geometry,
  }));

  return NextResponse.json({
    location: location,
    searchVariants: searchVariants,
    granularity: granularity,
    postalCodes: results.map(r => r.code),
    count: results.length,
    features: geoJsonResults,
  });
}

export const POST = withApiErrorHandling(postHandler);
export const GET = withApiErrorHandling(getHandler);
