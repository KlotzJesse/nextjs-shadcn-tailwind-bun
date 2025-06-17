import { NextResponse } from 'next/server';

const STATE_GEOJSON_URL = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/1_sehr_hoch.geo.json";

export async function GET() {
  try {
    const response = await fetch(STATE_GEOJSON_URL);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch state GeoJSON data' }, { status: 500 });
  }
} 