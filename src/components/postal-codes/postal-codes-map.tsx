"use client"

import { BaseMap } from "@/components/shared/base-map"
import { useMapState } from "@/lib/url-state/map-state"
import { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson"

interface PostalCodesMapProps {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
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