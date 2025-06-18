import { NextResponse } from 'next/server';
import { getStatesData } from '@/lib/utils/states-data';

export async function GET() {
  try {
    const data = await getStatesData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('API Error fetching states data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch state GeoJSON data' }, 
      { status: 500 }
    );
  }
} 