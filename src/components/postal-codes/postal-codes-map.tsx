"use client"

import { BaseMap } from "@/components/shared/base-map"
import type { MapData } from "@/lib/types/map-data"

interface PostalCodesMapProps {
  data: MapData
  onSearch?: (plz: string) => void
}

export function PostalCodesMap({ data, onSearch }: PostalCodesMapProps) {
  return (
    <BaseMap 
      data={data} 
      layerId="postal-codes" 
      onSearch={onSearch}
      center={[10.4515, 51.1657]}
      zoom={5}
    />
  )
} 