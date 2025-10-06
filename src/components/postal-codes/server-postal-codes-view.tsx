import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import { getPostalCodesDataForGranularity } from "@/lib/utils/postal-codes-data";
import { getStatesData } from "@/lib/utils/states-data";
import nextDynamic from "next/dynamic";
import { Suspense } from "react";

const PostalCodesViewClient = nextDynamic(
  () => import("@/components/postal-codes/postal-codes-view-client"),
  {
    loading: () => <PostalCodesViewSkeleton />,
  }
);

const PostalCodesViewClientWithLayers = nextDynamic(
  () => import("@/components/postal-codes/postal-codes-view-client-layers"),
  {
    loading: () => <PostalCodesViewSkeleton />,
  }
);

interface ServerPostalCodesViewProps {
  defaultGranularity: string;
  hasAreaContext?: boolean;
}

export default async function ServerPostalCodesView({
  defaultGranularity,
  hasAreaContext = false,
}: ServerPostalCodesViewProps) {
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(defaultGranularity),
    getStatesData(),
  ]);

  const ViewComponent = hasAreaContext
    ? PostalCodesViewClientWithLayers
    : PostalCodesViewClient;

  return (
    <PostalCodesErrorBoundary>
      <Suspense fallback={<PostalCodesViewSkeleton />}>
        <ViewComponent
          initialData={postalCodesData}
          statesData={statesData}
          defaultGranularity={defaultGranularity}
        />
      </Suspense>
    </PostalCodesErrorBoundary>
  );
}
