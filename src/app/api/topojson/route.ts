import { NextResponse } from 'next/server';
import * as topojson from 'topojson-client';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

const TOPOJSON_URLS: Record<string, string> = {
  "plz-1stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-1stellig/topojson/plz-1stellig.topojson",
  "plz-2stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-2stellig/topojson/plz-2stellig.topojson",
  "plz-3stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-3stellig/topojson/plz-3stellig.topojson",
  "plz-4stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-4stellig/topojson/plz-4stellig.topojson",
  "plz-5stellig": "https://download-v2.suche-postleitzahl.org/wgs84/gering2/plz-5stellig/topojson/plz-5stellig.topojson",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get('granularity');

  if (!granularity || !TOPOJSON_URLS[granularity]) {
    return NextResponse.json({ error: 'Invalid granularity' }, { status: 400 });
  }

  try {
    const response = await fetch(TOPOJSON_URLS[granularity]);
    const topo = await response.json();
    
    if (!topo || !topo.objects) {
      throw new Error('Invalid TopoJSON data received');
    }

    const firstKey = Object.keys(topo.objects)[0];
    if (!firstKey) {
      throw new Error('No objects found in TopoJSON data');
    }

    // Convert TopoJSON to GeoJSON
    const geoData = topojson.feature(topo, topo.objects[firstKey]) as Feature | FeatureCollection;

    // Ensure valid polygons by checking and fixing coordinates
    if ('features' in geoData) {
      const processedFeatures = geoData.features.map((feature: Feature) => {
        if (feature.geometry.type === 'Polygon') {
          const newCoordinates = feature.geometry.coordinates.map((ring: number[][]) => {
            // Skip invalid rings
            if (ring.length < 4) {
              return ring;
            }
            
            // Create a new array with the ring coordinates
            const newRing = [...ring];
            
            // Close the ring if needed
            const firstPoint = newRing[0];
            const lastPoint = newRing[newRing.length - 1];
            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
              newRing.push([...firstPoint]);
            }
            
            return newRing;
          });
          
          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: newCoordinates
            }
          } as Feature<Polygon>;
        }
        return feature;
      });

      return NextResponse.json({
        type: 'FeatureCollection',
        features: processedFeatures
      });
    }
    
    return NextResponse.json(geoData);
  } catch (error) {
    console.error('Error processing TopoJSON:', error);
    return NextResponse.json({ error: 'Failed to process TopoJSON data' }, { status: 500 });
  }
} 