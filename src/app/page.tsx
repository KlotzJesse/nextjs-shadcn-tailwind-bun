import { FeatureErrorBoundary } from "@/components/ui/error-boundaries";
import { HomePageSkeleton } from "@/components/ui/loading-skeletons";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const HomeContent = dynamic(() => import("./home-content"), {
  loading: () => <HomePageSkeleton />,
  ssr: true,
});

export const experimental_ppr = true;

export default function HomePage() {
  return (
    <FeatureErrorBoundary fallbackMessage="Fehler beim Laden der Startseite">
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeContent />
      </Suspense>
    </FeatureErrorBoundary>
  );
}
