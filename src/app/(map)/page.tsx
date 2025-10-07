import { FeatureErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ServerPostalCodesView = dynamic(
  () => import("@/components/postal-codes/server-postal-codes-view"),
  {
    loading: () => <PostalCodesViewSkeleton />,
    ssr: true,
  }
);

export const experimental_ppr = true;

export default function HomePage() {
  return (
    <div className="h-full px-4 lg:px-6">
      <FeatureErrorBoundary>
        <Suspense fallback={<PostalCodesViewSkeleton />}>
          <ServerPostalCodesView
            defaultGranularity="1digit"
            areaId={null}
            activeLayerId={null}
            versionId={null}
          />
        </Suspense>
      </FeatureErrorBoundary>
    </div>
  );
}