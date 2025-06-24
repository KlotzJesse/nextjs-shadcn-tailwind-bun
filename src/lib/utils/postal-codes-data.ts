import * as topojson from "topojson-client"
import type { MapData } from "@/lib/types/map-data"
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson"
import simplify from '@turf/simplify'
import bboxPolygon from '@turf/bbox-polygon'
import booleanIntersects from '@turf/boolean-intersects'

const TOPOJSON_URLS: Record<string, string> = {
  "plz-1stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-1stellig/topojson/plz-1stellig.topojson",
  "plz-2stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-2stellig/topojson/plz-2stellig.topojson",
  "plz-3stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-3stellig/topojson/plz-3stellig.topojson",
  "plz-4stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-4stellig/topojson/plz-4stellig.topojson",
  "plz-5stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-5stellig/topojson/plz-5stellig.topojson",
};

const fetchTopoJSON = async (
  granularity: string,
  options?: { bbox?: [number, number, number, number]; simplifyTolerance?: number }
): Promise<MapData> => {
  try {
    const response = await fetch(TOPOJSON_URLS[granularity], { 
      next: { 
        revalidate: 3600, // Cache for 1 hour
        tags: [`postal-codes-${granularity}`] // Tag for cache invalidation
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch TopoJSON data: ${response.statusText}`);
    }

    const topo = await response.json();
    
    if (!topo || !topo.objects) {
      throw new Error('Invalid TopoJSON data received');
    }

    const firstKey = Object.keys(topo.objects)[0];
    if (!firstKey) {
      throw new Error('No objects found in TopoJSON data');
    }

    // Convert TopoJSON to GeoJSON FeatureCollection
    const geoData = topojson.feature(topo, topo.objects[firstKey]) as Feature | FeatureCollection;
    
    // Ensure it's a FeatureCollection with correct properties
    const features = 'features' in geoData ? geoData.features : [geoData];
    let processedFeatures = features
      .filter((feature: Feature): feature is Feature<Polygon | MultiPolygon> => 
        feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'
      )
      .map((feature: Feature<Polygon | MultiPolygon>) => ({
        type: "Feature" as const,
        properties: {
          id: feature.properties?.id || feature.properties?.PLZ || feature.properties?.plz || feature.properties?.PLZ99 || feature.properties?.plz99 || feature.properties?.code || String(Math.random()),
          ...feature.properties
        },
        geometry: feature.geometry
      }))

    // Optional: filter by bbox
    if (options?.bbox) {
      const bboxPoly = bboxPolygon(options.bbox)
      processedFeatures = processedFeatures.filter(f => booleanIntersects(f, bboxPoly))
    }

    // Optional: simplify geometries
    const tolerance = options?.simplifyTolerance ?? 0.001
    processedFeatures = processedFeatures.map(f => simplify(f, { tolerance, highQuality: false }))

    return {
      type: "FeatureCollection" as const,
      features: processedFeatures
    };
  } catch (error) {
    console.error('Error fetching TopoJSON:', error);
    throw error;
  }
};

export async function getPostalCodesData(): Promise<Record<string, MapData>> {
  try {
    const granularities = Object.keys(TOPOJSON_URLS);
    const dataPromises = granularities.map(async (granularity) => {
      const data = await fetchTopoJSON(granularity);
      return { granularity, data };
    });

    const results = await Promise.all(dataPromises);
    
    const dataObject: Record<string, MapData> = {};
    results.forEach(({ granularity, data }) => {
      dataObject[granularity] = data;
    });

    return dataObject;
  } catch (error) {
    console.error('Error in getPostalCodesData:', error);
    throw error;
  }
}

export async function getPostalCodesDataForGranularity(granularity: string): Promise<MapData> {
  return fetchTopoJSON(granularity);
}

// Server-side function to get postal codes data with proper error handling
export async function getPostalCodesDataForGranularityServer(
  granularity: string,
  options?: { bbox?: [number, number, number, number]; simplifyTolerance?: number }
): Promise<MapData | null> {
  try {
    return await fetchTopoJSON(granularity, options);
  } catch (error) {
    console.error('Error in getPostalCodesDataForGranularityServer:', error);
    return null;
  }
} 