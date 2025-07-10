import { ApiError, withApiErrorHandling } from "@/lib/utils/api-error-handling";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema for validation
const GeocodeRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  includePostalCode: z.boolean().default(true),
  limit: z.number().max(20).default(5),
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
  [key: string]: unknown;
}

interface GeocodeResult {
  id: number;
  display_name: string;
  coordinates: [number, number];
  postal_code?: string;
  city?: string;
  state?: string;
  country?: string;
}

async function postHandler(request: NextRequest) {
  const body = await request.json();
  const { query, includePostalCode, limit } = GeocodeRequestSchema.parse(body);

  // Use Nominatim for geocoding
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&addressdetails=1&limit=${limit}&countrycodes=de`;

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "KRAUSS Territory Management/1.0",
    },
  });

  if (!response.ok) {
    throw new ApiError(
      502,
      "Geocoding service unavailable",
      "External Service Error"
    );
  }

  const nominatimResults: NominatimResult[] = await response.json();

  // Transform results to our format
  const results: GeocodeResult[] = nominatimResults.map((result) => ({
    id: result.place_id,
    display_name: result.display_name,
    coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
    postal_code: result.address?.postcode,
    city:
      result.address?.city || result.address?.town || result.address?.village,
    state: result.address?.state,
    country: result.address?.country,
  }));

  // Filter results that have postal codes if requested
  const filteredResults = includePostalCode
    ? results.filter((result) => result.postal_code)
    : results;

  return NextResponse.json({ results: filteredResults });
}

export const POST = withApiErrorHandling(postHandler);

async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const includePostalCode = searchParams.get("includePostalCode") === "true";
  const limit = parseInt(searchParams.get("limit") || "5");

  if (!query) {
    throw new ApiError(400, "Query parameter is required", "Missing Parameter");
  }

  GeocodeRequestSchema.parse({
    query,
    includePostalCode,
    limit,
  });

  // Use Nominatim for geocoding
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&addressdetails=1&limit=${limit}&countrycodes=de`;

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "KRAUSS Territory Management/1.0",
    },
  });

  if (!response.ok) {
    throw new ApiError(
      502,
      "Geocoding service unavailable",
      "External Service Error"
    );
  }

  const nominatimResults: NominatimResult[] = await response.json();

  // Transform results to our format
  const results: GeocodeResult[] = nominatimResults.map((result) => ({
    id: result.place_id,
    display_name: result.display_name,
    coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
    postal_code: result.address?.postcode,
    city:
      result.address?.city || result.address?.town || result.address?.village,
    state: result.address?.state,
    country: result.address?.country,
  }));

  // Filter results that have postal codes if requested
  const filteredResults = includePostalCode
    ? results.filter((result) => result.postal_code)
    : results;

  return NextResponse.json({ results: filteredResults });
}

export const GET = withApiErrorHandling(getHandler);
