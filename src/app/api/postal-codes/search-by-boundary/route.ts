import { db } from "@/lib/db";
import { postalCodes } from "@/lib/schema/schema";
import { ApiError, withApiErrorHandling } from "@/lib/utils/api-error-handling";
import { buildSearchQuery } from "@/lib/utils/postal-code-parser";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema for validation
const BoundarySearchRequestSchema = z.object({
  areaName: z.string().min(2, "Area name must be at least 2 characters"),
  granularity: z
    .enum(["1digit", "2digit", "3digit", "5digit"])
    .default("5digit"),
  limit: z.number().max(5000).default(3000), // Increased to handle large states like Bayern (2320 postal codes)
});

async function postHandler(request: NextRequest) {
  const body = await request.json();
  const { areaName, granularity, limit } =
    BoundarySearchRequestSchema.parse(body);

  try {
    // Get enhanced search variants
    const searchQueries = buildSearchQuery(areaName);

    let boundaryGeometry: string | null = null;
    let areaInfo: {
      display_name: string;
      boundingbox: [string, string, string, string];
    } | null = null;

    // Try to get the boundary geometry from Nominatim
    for (const searchQuery of searchQueries.slice(0, 3)) {
      try {
        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            format: "geojson",
            q: searchQuery,
            polygon_geojson: "1",
            addressdetails: "1",
            limit: "5",
            countrycodes: "de",
            "accept-language": "de,en",
            bounded: "1",
            viewbox: "5.8663,47.2701,15.0420,55.0581", // Germany bounding box
          });

        const response = await fetch(nominatimUrl, {
          headers: {
            "User-Agent":
              "KRAUSS Territory Management/1.0 (Boundary-based Postal Code Search)",
          },
        });

        if (!response.ok) continue;

        const geoJsonData = await response.json();

        if (geoJsonData.features && geoJsonData.features.length > 0) {
          const feature = geoJsonData.features[0];

          // Only process if we have a proper polygon/multipolygon geometry
          if (
            feature.geometry &&
            (feature.geometry.type === "Polygon" ||
              feature.geometry.type === "MultiPolygon")
          ) {
            // Convert GeoJSON to PostGIS geometry format
            boundaryGeometry = JSON.stringify(feature.geometry);
            areaInfo = {
              display_name: feature.properties.display_name,
              boundingbox: [
                feature.bbox[1].toString(), // south
                feature.bbox[3].toString(), // north
                feature.bbox[0].toString(), // west
                feature.bbox[2].toString(), // east
              ],
            };
            break;
          }
        }
      } catch (error) {
        console.warn(
          `Boundary search failed for query variant: ${searchQuery}`,
          error
        );
        continue;
      }
    }

    if (!boundaryGeometry || !areaInfo) {
      return NextResponse.json({
        postalCodes: [],
        searchInfo: {
          originalQuery: areaName,
          variantsUsed: searchQueries.slice(0, 3),
          boundaryFound: false,
          error: "No boundary geometry found for this area",
        },
      });
    }

    // Find all postal codes that intersect with the boundary
    const intersectingCodes = await db
      .select({
        code: postalCodes.code,
        granularity: postalCodes.granularity,
        properties: postalCodes.properties,
        geometry: sql`ST_AsGeoJSON(${postalCodes.geometry})`.as("geometry"),
      })
      .from(postalCodes)
      .where(
        sql`${postalCodes.granularity} = ${granularity}
            AND ST_Intersects(
              ${postalCodes.geometry},
              ST_GeomFromGeoJSON(${boundaryGeometry})
            )`
      )
      .limit(limit);

    // Extract just the postal codes for the response
    const codes = intersectingCodes.map((row) => row.code).sort();

    return NextResponse.json({
      postalCodes: codes,
      count: codes.length,
      granularity,
      areaInfo: {
        name: areaInfo.display_name,
        boundingbox: areaInfo.boundingbox,
      },
      searchInfo: {
        originalQuery: areaName,
        variantsUsed: searchQueries.slice(0, 3),
        boundaryFound: true,
        geometryType: boundaryGeometry
          ? JSON.parse(boundaryGeometry).type
          : null,
      },
    });
  } catch (error) {
    console.error("Boundary-based postal code search error:", error);
    throw new ApiError(
      500,
      "Failed to search postal codes by boundary",
      "Internal Server Error"
    );
  }
}

export const POST = withApiErrorHandling(postHandler);
