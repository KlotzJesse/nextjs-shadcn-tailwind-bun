"use client"

import { BaseMap } from "@/components/shared/base-map"
import type { MapData } from "@/lib/types/map-data"

interface StatesMapProps {
  data: MapData
  onSearch?: (stateName: string) => void
}

export function StatesMap({ data, onSearch }: StatesMapProps) {
  return (
    <BaseMap 
      data={data} 
      layerId="states" 
      onSearch={onSearch}
      center={[10.4515, 51.1657]}
      zoom={5}
    />
  )
} 