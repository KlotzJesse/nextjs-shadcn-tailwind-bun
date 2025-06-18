import { NextRequest, NextResponse } from 'next/server'
import { getPostalCodesDataForGranularityServer } from '@/lib/utils/postal-codes-data'

const VALID_GRANULARITIES = [
  "plz-1stellig",
  "plz-2stellig", 
  "plz-3stellig",
  "plz-5stellig",
] as const

type Granularity = typeof VALID_GRANULARITIES[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const granularity = searchParams.get('granularity')

  if (!granularity || !VALID_GRANULARITIES.includes(granularity as Granularity)) {
    return NextResponse.json(
      { error: 'Invalid granularity parameter' },
      { status: 400 }
    )
  }

  try {
    const data = await getPostalCodesDataForGranularityServer(granularity as Granularity)
    
    if (!data) {
      return NextResponse.json(
        { error: 'Data not found for the specified granularity' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching postal codes data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 