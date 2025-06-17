import { cache } from 'react'
import * as topojson from "topojson-client"
import { getMapData } from '@/lib/utils/map-data';

const TOPOJSON_URLS: Record<string, string> = {
  "plz-1stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-1stellig/topojson/plz-1stellig.topojson",
  "plz-2stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-2stellig/topojson/plz-2stellig.topojson",
  "plz-3stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-3stellig/topojson/plz-3stellig.topojson",
  "plz-4stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-4stellig/topojson/plz-4stellig.topojson",
  "plz-5stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-5stellig/topojson/plz-5stellig.topojson",
};

const STATE_GEOJSON_URL = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/1_sehr_hoch.geo.json";

// Cache the fetch requests
const fetchTopoJSON = cache(async (granularity: string) => {
  try {
    const response = await fetch(`/api/topojson?granularity=${granularity}`, { 
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

    return topojson.feature(topo, topo.objects[firstKey]);
  } catch (error) {
    console.error('Error fetching TopoJSON:', error);
    throw error;
  }
});

const fetchStateGeo = cache(async () => {
  try {
    const response = await fetch(`/api/states`, { 
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch state GeoJSON data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching state GeoJSON:', error);
    throw error;
  }
});

export const MapData = cache(async ({ granularity = "plz-5stellig" }: { granularity?: string }) => {
  return getMapData(granularity);
}); 