import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";
import { getStatesData } from "@/lib/utils/states-data";
import { PostalCodesViewServer } from "./postal-codes-view-server";
import { Suspense } from "react";
import {
  getAreas,
  getAreaById,
  getLayers,
  getVersions,
  getChangeHistory,
  getUndoRedoStatus,
} from "@/lib/db/data-functions";
import { PostalCodesViewClientWithLayers } from "./postal-codes-view-client-layers";
import { areas, areaLayers } from "@/lib/schema/schema";
import type { InferSelectModel } from "drizzle-orm";
import type {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

interface ServerPostalCodesViewProps {
  defaultGranularity: string;
  areaId?: number | null;
  activeLayerId?: number | null;
  versionId?: number | null;
}

export default async function ServerPostalCodesView({
  defaultGranularity,
  areaId,
  activeLayerId,
  versionId,
}: ServerPostalCodesViewProps) {
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(defaultGranularity),
    getStatesData(),
  ]);

  const [areas, area, layers, versions, changes, undoRedoStatus] =
    await Promise.all([
      getAreas(),
      getAreaById(areaId),
      getLayers(areaId),
      getVersions(areaId),
      getChangeHistory(areaId, { limit: 50 }),
      getUndoRedoStatus(areaId),
    ]);

  return (
    <PostalCodesErrorBoundary>
      <Suspense fallback={<PostalCodesViewSkeleton />}>
        <PostalCodesViewClientWithLayers
          initialData={postalCodesData}
          statesData={statesData}
          defaultGranularity={defaultGranularity}
          areaId={areaId}
          activeLayerId={activeLayerId || null}
          initialAreas={areas}
          initialArea={area}
          initialLayers={layers}
          initialVersions={versions}
          initialChanges={changes}
          initialUndoRedoStatus={undoRedoStatus}
          isViewingVersion={false}
          versionId={versionId || null}
          versions={versions}
          changes={changes}
        />
      </Suspense>
    </PostalCodesErrorBoundary>
  );
}
