"use client"

import { BaseMap } from "@/components/shared/base-map"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from '@/lib/url-state/map-state'

interface PostalCodesMapProps {
  data: MapData
  statesData: MapData
  onSearch?: (plz: string) => void
  granularity?: string
  onGranularityChange?: (granularity: string) => void
}

export function PostalCodesMap({ data, statesData, onSearch, granularity, onGranularityChange }: PostalCodesMapProps) {
  const { center, zoom } = useMapState()

  return (
    <BaseMap 
      data={data} 
      layerId="postal-codes" 
      onSearch={onSearch}
      center={center}
      zoom={zoom}
      statesData={statesData}
      granularity={granularity}
      onGranularityChange={onGranularityChange}
    />
  )
}