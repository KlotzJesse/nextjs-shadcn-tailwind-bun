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

interface ServerPostalCodesViewProps {
  defaultGranularity: string;
}

export const dynamic = "force-static";

export default async function ServerPostalCodesView({
  defaultGranularity,
}: ServerPostalCodesViewProps) {
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(defaultGranularity),
    getStatesData(),
  ]);

  return (
    <PostalCodesErrorBoundary>
      <Suspense fallback={<PostalCodesViewSkeleton />}>
        <PostalCodesViewClient
          initialData={postalCodesData}
          statesData={statesData}
          defaultGranularity={defaultGranularity}
        />
      </Suspense>
    </PostalCodesErrorBoundary>
  );
}
