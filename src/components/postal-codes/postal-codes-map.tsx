"use client"

import { BaseMap } from "@/components/shared/base-map"
import type { MapData } from "@/lib/types/map-data"
import { getStatesData } from '@/lib/utils/states-data'
import { useEffect, useState } from 'react'

interface PostalCodesMapProps {
  data: MapData
  onSearch?: (plz: string) => void
  granularity?: string
  onGranularityChange?: (granularity: string) => void
}

export function PostalCodesMap({ data, onSearch, granularity, onGranularityChange }: PostalCodesMapProps) {
  const [statesData, setStatesData] = useState<MapData | null>(null)

  useEffect(() => {
    getStatesData().then(setStatesData).catch(() => setStatesData(null))
  }, [])

  return (
    <BaseMap 
      data={data} 
      layerId="postal-codes" 
      onSearch={onSearch}
      center={[10.4515, 51.1657]}
      zoom={5}
      statesData={statesData}
      granularity={granularity}
      onGranularityChange={onGranularityChange}
    />
  )
} 