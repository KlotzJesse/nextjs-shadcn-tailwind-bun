"use client";

import { BaseMap } from "@/components/shared/base-map";
import type { MapData } from "@/lib/types";
import { useMapState } from "@/lib/url-state/map-state";

interface PostalCodesMapProps {
  data: MapData;
  onSearch?: (plz: string) => void;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  statesData?: MapData | null;
}

export function PostalCodesMap({
  data,
  onSearch,
  granularity,
  onGranularityChange,
  statesData,
}: PostalCodesMapProps) {
  const { center, zoom } = useMapState();

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
  );
}
