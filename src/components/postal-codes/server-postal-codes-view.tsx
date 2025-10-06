import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";
import { getStatesData } from "@/lib/utils/states-data";
import { PostalCodesViewServer } from "./postal-codes-view-server";
import { Suspense } from "react";

interface ServerPostalCodesViewProps {
  defaultGranularity: string;
  areaId?: number | null;
  activeLayerId?: number | null;
}

export default async function ServerPostalCodesView({
  defaultGranularity,
  areaId,
  activeLayerId,
}: ServerPostalCodesViewProps) {
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(defaultGranularity),
    getStatesData(),
  ]);

  return (
    <PostalCodesErrorBoundary>
      <Suspense fallback={<PostalCodesViewSkeleton />}>
        <PostalCodesViewServer
          initialData={postalCodesData}
          statesData={statesData}
          defaultGranularity={defaultGranularity}
          areaId={areaId}
          activeLayerId={activeLayerId}
        />
      </Suspense>
    </PostalCodesErrorBoundary>
  );
}
