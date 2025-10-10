import { FeatureErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PostalCodesOverview } from "@/components/postal-codes/postal-codes-overview";

const ServerPostalCodesView = dynamic(
  () => import("@/components/postal-codes/server-postal-codes-view"),
  {
    loading: () => <PostalCodesViewSkeleton />,
    ssr: true,
  }
);

export const experimental_ppr = true;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const areaId = (await searchParams).areaId;
  const versionId = (await searchParams).versionId;
  const activeLayerId = (await searchParams).activeLayerId;

  if (!areaId) {
    return <PostalCodesOverview />;
  }

  console.log({ areaId, versionId, activeLayerId });
  return (
    <div className="h-full px-4 lg:px-6">
      <FeatureErrorBoundary>
        <Suspense fallback={<PostalCodesViewSkeleton />}>
          <ServerPostalCodesView
            defaultGranularity="1digit"
            areaId={parseInt(areaId as string)}
            activeLayerId={parseInt(versionId as string)}
            versionId={parseInt(activeLayerId as string)}
          />
        </Suspense>
      </FeatureErrorBoundary>
    </div>
  );
}
