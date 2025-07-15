import { ApiError, withApiErrorHandling } from "@/lib/utils/api-error-handling";
import { buildSearchQuery } from "@/lib/utils/postal-code-parser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema for validation
const GeocodeRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  includePostalCode: z.boolean().default(true),
  limit: z.number().max(20).default(5),
  enhancedSearch: z.boolean().default(true), // Enable enhanced German/English search
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
  const { query, includePostalCode, limit, enhancedSearch } =
    GeocodeRequestSchema.parse(body);

  let allResults: GeocodeResult[] = [];

  if (enhancedSearch) {
    // Use enhanced search with multiple query variants
    const searchQueries = buildSearchQuery(query);
    const maxResultsPerQuery = Math.ceil(limit / searchQueries.length);

    for (const searchQuery of searchQueries.slice(0, 3)) {
      // Limit to 3 variants to avoid too many requests
      try {
        const results = await performNominatimSearch(
          searchQuery,
          maxResultsPerQuery
        );
        allResults.push(...results);

        // Break early if we have enough results
        if (allResults.length >= limit) break;
      } catch (error) {
        console.warn(`Search failed for query variant: ${searchQuery}`, error);
        // Continue with next variant
      }
    }
  } else {
    // Use original simple search
    allResults = await performNominatimSearch(query, limit);
  }

  // Remove duplicates based on coordinates (within 100m)
  const uniqueResults = removeDuplicateResults(allResults);

  // Sort by relevance (exact postal code matches first, then by distance from major cities)
  const sortedResults = sortResultsByRelevance(uniqueResults, query);

  // Limit to requested number
  const limitedResults = sortedResults.slice(0, limit);

  // Filter results that have postal codes if requested
  const filteredResults = includePostalCode
    ? limitedResults.filter((result) => result.postal_code)
    : limitedResults;

  return NextResponse.json({
    results: filteredResults,
    searchInfo: {
      originalQuery: query,
      variantsUsed: enhancedSearch
        ? buildSearchQuery(query).slice(0, 3)
        : [query],
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
    },
  });
}

async function performNominatimSearch(
  query: string,
  limit: number
): Promise<GeocodeResult[]> {
  // Use Nominatim for geocoding with enhanced parameters
  const nominatimUrl =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      format: "json",
      q: query,
      addressdetails: "1",
      limit: limit.toString(),
      countrycodes: "de",
      "accept-language": "de,en", // Prefer German, fallback to English
      bounded: "1", // Prefer results within the country bounds
      viewbox: "5.8663,47.2701,15.0420,55.0581", // Germany bounding box
    });

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent":
        "KRAUSS Territory Management/1.0 (Enhanced German/English Search)",
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
  return nominatimResults.map((result) => ({
    id: result.place_id,
    display_name: result.display_name,
    coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
    postal_code: result.address?.postcode,
    city:
      result.address?.city || result.address?.town || result.address?.village,
    state: result.address?.state,
    country: result.address?.country,
  }));
}

function removeDuplicateResults(results: GeocodeResult[]): GeocodeResult[] {
  const unique: GeocodeResult[] = [];
  const DISTANCE_THRESHOLD = 0.001; // ~100m in degrees

  for (const result of results) {
    const isDuplicate = unique.some(
      (existing) =>
        Math.abs(existing.coordinates[0] - result.coordinates[0]) <
          DISTANCE_THRESHOLD &&
        Math.abs(existing.coordinates[1] - result.coordinates[1]) <
          DISTANCE_THRESHOLD
    );

    if (!isDuplicate) {
      unique.push(result);
    }
  }

  return unique;
}

function sortResultsByRelevance(
  results: GeocodeResult[],
  originalQuery: string
): GeocodeResult[] {
  const queryLower = originalQuery.toLowerCase();
  const isPostalCodeQuery = /^\d{1,5}/.test(originalQuery.trim());

  return results.sort((a, b) => {
    // Exact postal code matches get highest priority
    if (isPostalCodeQuery) {
      const aPostalMatch = a.postal_code?.startsWith(
        originalQuery.replace(/\D/g, "")
      );
      const bPostalMatch = b.postal_code?.startsWith(
        originalQuery.replace(/\D/g, "")
      );

      if (aPostalMatch && !bPostalMatch) return -1;
      if (!aPostalMatch && bPostalMatch) return 1;
    }

    // City/state name matches get high priority
    const aCityMatch =
      a.city?.toLowerCase().includes(queryLower) ||
      a.state?.toLowerCase().includes(queryLower);
    const bCityMatch =
      b.city?.toLowerCase().includes(queryLower) ||
      b.state?.toLowerCase().includes(queryLower);

    if (aCityMatch && !bCityMatch) return -1;
    if (!aCityMatch && bCityMatch) return 1;

    // Prefer results with postal codes
    if (a.postal_code && !b.postal_code) return -1;
    if (!a.postal_code && b.postal_code) return 1;

    return 0; // Keep original order for similar relevance
  });
}

export const POST = withApiErrorHandling(postHandler);

async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const includePostalCode = searchParams.get("includePostalCode") === "true";
  const limit = parseInt(searchParams.get("limit") || "5");
  const enhancedSearch = searchParams.get("enhancedSearch") !== "false"; // Default to true

  if (!query) {
    throw new ApiError(400, "Query parameter is required", "Missing Parameter");
  }

  GeocodeRequestSchema.parse({
    query,
    includePostalCode,
    limit,
    enhancedSearch,
  });

  let allResults: GeocodeResult[] = [];

  if (enhancedSearch) {
    // Use enhanced search with multiple query variants
    const searchQueries = buildSearchQuery(query);
    const maxResultsPerQuery = Math.ceil(limit / searchQueries.length);

    for (const searchQuery of searchQueries.slice(0, 3)) {
      // Limit to 3 variants
      try {
        const results = await performNominatimSearch(
          searchQuery,
          maxResultsPerQuery
        );
        allResults.push(...results);

        // Break early if we have enough results
        if (allResults.length >= limit) break;
      } catch (error) {
        console.warn(`Search failed for query variant: ${searchQuery}`, error);
        // Continue with next variant
      }
    }
  } else {
    // Use original simple search
    allResults = await performNominatimSearch(query, limit);
  }

  // Remove duplicates and sort
  const uniqueResults = removeDuplicateResults(allResults);
  const sortedResults = sortResultsByRelevance(uniqueResults, query);
  const limitedResults = sortedResults.slice(0, limit);

  // Filter results that have postal codes if requested
  const filteredResults = includePostalCode
    ? limitedResults.filter((result) => result.postal_code)
    : limitedResults;

  return NextResponse.json({
    results: filteredResults,
    searchInfo: {
      originalQuery: query,
      variantsUsed: enhancedSearch
        ? buildSearchQuery(query).slice(0, 3)
        : [query],
      totalResults: allResults.length,
      uniqueResults: uniqueResults.length,
    },
  });
}

export const GET = withApiErrorHandling(getHandler);
