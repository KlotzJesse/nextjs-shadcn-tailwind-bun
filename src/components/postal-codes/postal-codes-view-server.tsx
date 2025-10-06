import { Suspense } from "react";
import {
  getAreasAction,
  getAreaByIdAction,
  getLayersAction,
} from "@/app/actions/area-actions";
import { PostalCodesViewClientWithLayers } from "./postal-codes-view-client-layers";
import PostalCodesViewClient from "./postal-codes-view-client";
import { areas, areaLayers } from "@/lib/schema/schema";
import type { InferSelectModel } from "drizzle-orm";
import type {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

type Area = InferSelectModel<typeof areas>;
type Layer = InferSelectModel<typeof areaLayers> & {
  postalCodes?: { postalCode: string }[];
};

interface PostalCodesViewServerProps {
  initialData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  defaultGranularity: string;
  areaId?: number | null;
  activeLayerId?: number | null;
}

export async function PostalCodesViewServer({
  initialData,
  statesData,
  defaultGranularity,
  areaId,
  activeLayerId,
}: PostalCodesViewServerProps) {
  // If we have an areaId, fetch the area and layers data on the server
  if (areaId && areaId > 0) {
    const [areasResult, areaResult, layersResult] = await Promise.all([
      getAreasAction(),
      getAreaByIdAction(areaId),
      getLayersAction(areaId),
    ]);

    const areas = areasResult.success ? areasResult.data : [];
    const area = areaResult.success ? areaResult.data : null;
    const layers = layersResult.success ? layersResult.data : [];

    return (
      <PostalCodesViewClientWithLayers
        initialData={initialData}
        statesData={statesData}
        defaultGranularity={defaultGranularity}
        areaId={areaId}
        activeLayerId={activeLayerId || null}
        initialAreas={areas || []}
        initialArea={area}
        initialLayers={layers || []}
      />
    );
  }

  // If no areaId, use the basic client component
  return (
    <PostalCodesViewClient
      initialData={initialData}
      statesData={statesData}
      defaultGranularity={defaultGranularity}
    />
  );
}
