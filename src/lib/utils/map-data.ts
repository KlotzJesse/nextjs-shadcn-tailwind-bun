import * as topojson from "topojson-client"
import type { Feature, FeatureCollection, Polygon, MultiPolygon, GeoJsonProperties } from "geojson"
import centroid from '@turf/centroid'
import area from '@turf/area'
import { point } from '@turf/helpers'

const TOPOJSON_URLS: Record<string, string> = {
  "plz-1stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-1stellig/topojson/plz-1stellig.topojson",
  "plz-2stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-2stellig/topojson/plz-2stellig.topojson",
  "plz-3stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-3stellig/topojson/plz-3stellig.topojson",
  "plz-4stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-4stellig/topojson/plz-4stellig.topojson",
  "plz-5stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-5stellig/topojson/plz-5stellig.topojson",
};

const STATE_GEOJSON_URL = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/4_niedrig.geo.json";

// Cache the fetch requests
const fetchTopoJSON = async (granularity: string): Promise<MapData> => {
  try {
    const response = await fetch(TOPOJSON_URLS[granularity], { 
      next: { revalidate: 3600 }
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
    const processedFeatures = features
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
      }));

    return {
      type: "FeatureCollection" as const,
      features: processedFeatures
    };
  } catch (error) {
    console.error('Error fetching TopoJSON:', error);
    throw error;
  }
};

const fetchStateGeo = async (): Promise<FeatureCollection> => {
  try {
    const response = await fetch(STATE_GEOJSON_URL, { 
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch state GeoJSON data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as FeatureCollection;
  } catch (error) {
    console.error('Error fetching state GeoJSON:', error);
    throw error;
  }
};

export async function getMapData(granularity: string): Promise<{ geoData: FeatureCollection; stateGeo: FeatureCollection }> {
  try {
    const [geoData, stateGeo] = await Promise.all([
      fetchTopoJSON(granularity),
      fetchStateGeo()
    ]);

    return { geoData, stateGeo };
  } catch (error) {
    console.error('Error in getMapData:', error);
    throw error;
  }
}

/**
 * Returns an empty GeoJSON FeatureCollection.
 */
export function emptyFeatureCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

/**
 * Returns a FeatureCollection containing only features with the given IDs.
 */
export function featureCollectionFromIds(data: FeatureCollection, ids: string[]): FeatureCollection {
  if (!data || !Array.isArray(data.features)) return emptyFeatureCollection();
  return {
    type: 'FeatureCollection',
    features: (data.features as Feature[]).filter((f) => ids.includes(f.properties?.id)).map(f => f)
  }
}

/**
 * Returns the centroid of the largest polygon in a feature.
 */
export function getLargestPolygonCentroid(feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>) {
  if (feature.geometry.type === 'Polygon') {
    return centroid(feature).geometry.coordinates
  }
  if (feature.geometry.type === 'MultiPolygon') {
    let maxArea = 0
    let maxPoly: Polygon | null = null
    for (const coords of feature.geometry.coordinates) {
      const poly: Polygon = { type: 'Polygon', coordinates: coords }
      const polyArea = area(poly)
      if (polyArea > maxArea) {
        maxArea = polyArea
        maxPoly = poly
      }
    }
    if (maxPoly) {
      return centroid(maxPoly).geometry.coordinates
    }
  }
  return centroid(feature).geometry.coordinates
}

/**
 * Creates a FeatureCollection of label points from a polygon FeatureCollection.
 */
export function makeLabelPoints(features: FeatureCollection) {
  return {
    type: 'FeatureCollection',
    features: (features.features as Feature[]).map((f) => {
      const coords = getLargestPolygonCentroid(f as Feature<Polygon | MultiPolygon, GeoJsonProperties>);
      return point(coords, f.properties);
    })
  }
} 