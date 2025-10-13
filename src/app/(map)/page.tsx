import { PostalCodesOverview } from "@/components/postal-codes/postal-codes-overview";
import { HomePageSkeleton } from "@/components/ui/loading-skeletons";
import { Suspense } from "react";

export const experimental_ppr = true;

export default async function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <PostalCodesOverview />
    </Suspense>
  );
}
