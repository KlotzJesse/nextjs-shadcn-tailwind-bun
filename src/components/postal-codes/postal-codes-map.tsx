import dynamic from "next/dynamic";
const BaseMap = dynamic(() =>
  import("@/components/shared/base-map").then((m) => m.BaseMap)
);

import { useMapState } from "@/lib/url-state/map-state";

export function PostalCodesMap({
  data,
  statesData,
  onSearch,
  granularity,
  onGranularityChange,
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
