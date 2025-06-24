import { Suspense } from 'react';
import { Metadata } from "next"
import { PostalCodesView } from '@/components/postal-codes/postal-codes-view';
import { getPostalCodesDataForGranularityServer } from "@/lib/utils/postal-codes-data"
import { notFound } from 'next/navigation'

const VALID_GRANULARITIES = [
  "plz-1stellig",
  "plz-2stellig", 
  "plz-3stellig",
  "plz-5stellig",
] as const

type Granularity = typeof VALID_GRANULARITIES[number]

interface PostalCodesPageProps {
  params: Promise<{ granularity: string }>
}

export async function generateStaticParams() {
  return VALID_GRANULARITIES.map((granularity) => ({
    granularity,
  }))
}

export async function generateMetadata({
  params,
}: PostalCodesPageProps): Promise<Metadata> {
  const { granularity } = await params
  
  if (!VALID_GRANULARITIES.includes(granularity as Granularity)) {
    return {
      title: "KRAUSS Territory Management - Postal Codes",
      description: "Interactive territory management for German postal code regions",
    }
  }

  return {
    title: `KRAUSS Territory Management - ${granularity.toUpperCase()} Postal Codes`,
    description: `Interactive territory management for German postal code regions with ${granularity} granularity`,
    openGraph: {
      title: `KRAUSS Territory Management - ${granularity.toUpperCase()} Postal Codes`,
      description: `Interactive territory management for German postal code regions with ${granularity} granularity`,
      type: 'website',
    },
  }
}

export default async function PostalCodesPage({ params }: PostalCodesPageProps) {
  const { granularity } = await params
  
  if (!VALID_GRANULARITIES.includes(granularity as Granularity)) {
    notFound()
  }

  const postalCodesData = await getPostalCodesDataForGranularityServer(granularity, {
    // bbox: [minLng, minLat, maxLng, maxLat], // TODO: pass viewport bbox for further optimization
    simplifyTolerance: 0.001
  })

  if (!postalCodesData) {
    notFound()
  }

  return (
    <div className="h-full px-4 lg:px-6">
      <Suspense fallback={<PostalCodesLoading />}>
        <PostalCodesView initialData={postalCodesData} defaultGranularity={granularity} />
      </Suspense>
    </div>
  )
}

function PostalCodesLoading() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 @container/main:h-full h-full">
      <div className="col-span-3 space-y-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="col-span-9">
        <div className="h-full bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  )
} 