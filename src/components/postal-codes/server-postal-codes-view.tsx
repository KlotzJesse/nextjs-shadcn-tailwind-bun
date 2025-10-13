import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";

import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";

import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";

import { getStatesData } from "@/lib/utils/states-data";

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

interface ServerPostalCodesViewProps {
  defaultGranularity: string;

  areaId: number;

  versionId: number;
}

export default async function ServerPostalCodesView({
  defaultGranularity,
  areaId,
  versionId,
}: ServerPostalCodesViewProps) {
  // Server Component: initiate all fetches as promises
  // Pass promises down - let components consume where needed
  // Deduplication ensures efficiency
  const postalCodesDataPromise = getPostalCodesDataForGranularity(defaultGranularity);
  const statesDataPromise = getStatesData();
  const areasPromise = getAreas();
  const areaPromise = getAreaById(areaId);
  const layersPromise = getLayers(areaId);
  const versionsPromise = getVersions(areaId);
  const changesPromise = getChangeHistory(areaId, { limit: 50 });
  const undoRedoStatusPromise = getUndoRedoStatus(areaId);

  return (
    <PostalCodesErrorBoundary>
      <Suspense fallback={<PostalCodesViewSkeleton />}>
        <PostalCodesViewClientWithLayers
          postalCodesDataPromise={postalCodesDataPromise}
          statesDataPromise={statesDataPromise}
          defaultGranularity={defaultGranularity}
          areaId={areaId}
          areasPromise={areasPromise}
          areaPromise={areaPromise}
          layersPromise={layersPromise}
          undoRedoStatusPromise={undoRedoStatusPromise}
          isViewingVersion={false}
          versionId={versionId || null}
          versionsPromise={versionsPromise}
          changesPromise={changesPromise}
        />
      </Suspense>
    </PostalCodesErrorBoundary>
  );
}
