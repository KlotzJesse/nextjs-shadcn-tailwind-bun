import { Suspense } from 'react';
import { MapView } from '@/components/map/map-view';
import { Metadata, Viewport } from "next"
import { headers } from 'next/headers';
import type { MapData } from './map-data';
import { getMapData } from "@/lib/utils/map-data"

const GRANULARITIES = [
  "plz-1stellig",
  "plz-2stellig",
  "plz-3stellig",
  "plz-4stellig",
  "plz-5stellig",
] as const

// Generate static params for all granularity levels
export async function generateStaticParams() {
  return GRANULARITIES.map((granularity) => ({
    granularity,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ granularity: string }>
}): Promise<Metadata> {
  const { granularity } = await params
  return {
    title: `Germany Map - ${granularity.toUpperCase()}`,
    description: `Interactive map of Germany showing ${granularity} postal code regions`,
    openGraph: {
      title: `Germany Map - ${granularity.toUpperCase()}`,
      description: `Interactive map of Germany showing ${granularity} postal code regions`,
      type: 'website',
    },
  }
}

// Generate viewport for mobile optimization
export async function generateViewport({
  params,
}: {
  params: Promise<{ granularity: string }>
}): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
}

// Set revalidation time for the page
export const revalidate = 3600 // Revalidate every hour

interface PageProps {
  params: Promise<{
    granularity: string
  }>
}

export default async function MapPage({ params }: PageProps) {
  // Await the params
  const { granularity } = await params
  const data = await getMapData(granularity)

  return (
    <Suspense fallback={<div>Loading map data...</div>}>
      <MapView data={data} granularity={granularity} />
    </Suspense>
  )
} 