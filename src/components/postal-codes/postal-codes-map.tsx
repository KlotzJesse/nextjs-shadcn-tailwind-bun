import dynamic from "next/dynamic";
const BaseMap = dynamic(() =>
  import("@/components/shared/base-map").then((m) => m.BaseMap)
);

import { useMapState } from "@/lib/url-state/map-state";
import { Layer } from "@/lib/hooks/use-areas";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

interface PostalCodesMapProps {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  onSearch?: (plz: string) => void;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  layers?: Layer[];
  activeLayerId?: number | null;
  areaId?: number | null;
}

export function PostalCodesMap({
  data,
  statesData,
  onSearch,
  granularity,
  onGranularityChange,
  layers = [],
  activeLayerId = null,
  areaId = null,
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
      layers={layers}
      activeLayerId={activeLayerId}
      areaId={areaId}
    />
  );
}
