"use client"

import dynamic from "next/dynamic"

const GRANULARITIES = [
  "plz-1stellig",
  "plz-2stellig",
  "plz-3stellig",
  "plz-4stellig",
  "plz-5stellig",
] as const

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
})

interface MapClientProps {
  initialGeoData: any;
  initialStateGeo: any;
  initialGranularity: typeof GRANULARITIES[number];
}

export function MapClient({ initialGeoData, initialStateGeo, initialGranularity }: MapClientProps) {
  return (
    <MapView 
      initialGeoData={initialGeoData} 
      initialStateGeo={initialStateGeo} 
      initialGranularity={initialGranularity}
    />
  )
} 