import * as topojson from "topojson-client";
import type { MapData } from "@/lib/types";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "geojson";
import simplify from "@turf/simplify";
import bboxPolygon from "@turf/bbox-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import { promises as fs } from "fs";

// Read TopoJSON data from file system (server-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTopoJSONData = async (granularity: string): Promise<any> => {
  const validGranularities = [
    "plz-1stellig",
    "plz-2stellig",
    "plz-3stellig",
    "plz-5stellig",
  ];

  if (!validGranularities.includes(granularity)) {
    throw new Error(`Unknown granularity: ${granularity}`);
  }

  try {
    const filePath =
      process.cwd() + `/src/data/postal-codes/${granularity}.topojson`;
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading TopoJSON file for ${granularity}:`, error);
    throw new Error(`Failed to load data for granularity: ${granularity}`);
  }
};

const processTopoJSON = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topo: any,
  options?: {
    bbox?: [number, number, number, number];
    simplifyTolerance?: number;
  }
): MapData => {
  if (!topo || !topo.objects) {
    throw new Error("Invalid TopoJSON data received");
  }

  const firstKey = Object.keys(topo.objects)[0];
  if (!firstKey) {
    throw new Error("No objects found in TopoJSON data");
  }

  // Convert TopoJSON to GeoJSON FeatureCollection
  const geoData = topojson.feature(topo, topo.objects[firstKey]) as
    | Feature
    | FeatureCollection;

  // Ensure it's a FeatureCollection with correct properties
  const features = "features" in geoData ? geoData.features : [geoData];
  let processedFeatures = features
    .filter(
      (feature: Feature): feature is Feature<Polygon | MultiPolygon> =>
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
    )
    .map((feature: Feature<Polygon | MultiPolygon>) => ({
      type: "Feature" as const,
      properties: {
        id:
          feature.properties?.id ||
          feature.properties?.PLZ ||
          feature.properties?.plz ||
          feature.properties?.PLZ99 ||
          feature.properties?.plz99 ||
          feature.properties?.code ||
          String(Math.random()),
        ...feature.properties,
      },
      geometry: feature.geometry,
    }));

  // Optional: filter by bbox
  if (options?.bbox) {
    const bboxPoly = bboxPolygon(options.bbox);
    processedFeatures = processedFeatures.filter((f) =>
      booleanIntersects(f, bboxPoly)
    );
  }

  // Optional: simplify geometries
  const tolerance = options?.simplifyTolerance ?? 0.001;
  processedFeatures = processedFeatures.map((f) =>
    simplify(f, { tolerance, highQuality: false })
  );

  return {
    type: "FeatureCollection" as const,
    features: processedFeatures,
  };
};

export async function getPostalCodesData(): Promise<Record<string, MapData>> {
  try {
    const granularities = [
      "plz-1stellig",
      "plz-2stellig",
      "plz-3stellig",
      "plz-5stellig",
    ];
    const dataObject: Record<string, MapData> = {};

    for (const granularity of granularities) {
      const topo = await getTopoJSONData(granularity);
      const data = processTopoJSON(topo);
      dataObject[granularity] = data;
    }

    return dataObject;
  } catch (error) {
    console.error("Error in getPostalCodesData:", error);
    throw error;
  }
}

export async function getPostalCodesDataForGranularity(
  granularity: string
): Promise<MapData> {
  try {
    const topo = await getTopoJSONData(granularity);
    return processTopoJSON(topo);
  } catch (error) {
    console.error("Error in getPostalCodesDataForGranularity:", error);
    throw error;
  }
}

// Server-side function to get postal codes data with proper error handling
export async function getPostalCodesDataForGranularityServer(
  granularity: string,
  options?: {
    bbox?: [number, number, number, number];
    simplifyTolerance?: number;
  }
): Promise<MapData | null> {
  try {
    const topo = await getTopoJSONData(granularity);
    return processTopoJSON(topo, options);
  } catch (error) {
    console.error("Error in getPostalCodesDataForGranularityServer:", error);
    return null;
  }
}
