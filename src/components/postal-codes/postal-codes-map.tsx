"use client"

import { BaseMap } from "@/components/shared/base-map"
import type { MapData } from "@/lib/types/map-data"
import { getStatesData } from '@/lib/utils/states-data'
import { useEffect, useState } from 'react'
import { useMapState } from '@/lib/url-state/map-state'

interface PostalCodesMapProps {
  data: MapData
  onSearch?: (plz: string) => void
  granularity?: string
  onGranularityChange?: (granularity: string) => void
}

export function PostalCodesMap({ data, onSearch, granularity, onGranularityChange }: PostalCodesMapProps) {
  const [statesData, setStatesData] = useState<MapData | null>(null)
  const { center, zoom } = useMapState()

  useEffect(() => {
    getStatesData().then(setStatesData).catch(() => setStatesData(null))
  }, [])

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