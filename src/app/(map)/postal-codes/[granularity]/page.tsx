import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Suspense } from "react";

const ServerPostalCodesView = nextDynamic(
  () => import("@/components/postal-codes/server-postal-codes-view"),
  {
    loading: () => <PostalCodesViewSkeleton />,
    ssr: true,
  }
);

export const experimental_ppr = true;
export const dynamic = "force-static";

const VALID_GRANULARITIES = ["1digit", "2digit", "3digit", "5digit"] as const;

type Granularity = (typeof VALID_GRANULARITIES)[number];

interface PostalCodesPageProps {
  params: Promise<{ granularity: string }>;
}

export async function generateStaticParams() {
  return VALID_GRANULARITIES.map((granularity) => ({
    granularity,
  }));
}

export async function generateMetadata({
  params,
}: PostalCodesPageProps): Promise<Metadata> {
  const { granularity } = await params;

  if (!VALID_GRANULARITIES.includes(granularity as Granularity)) {
    return {
      title: "KRAUSS Territory Management - Postal Codes",
      description:
        "Interactive territory management for German postal code regions",
    };
  }

  return {
    title: `KRAUSS Territory Management - ${granularity.toUpperCase()} Postal Codes`,
    description: `Interactive territory management for German postal code regions with ${granularity} granularity`,
    openGraph: {
      title: `KRAUSS Territory Management - ${granularity.toUpperCase()} Postal Codes`,
      description: `Interactive territory management for German postal code regions with ${granularity} granularity`,
      type: "website",
    },
  };
}

export default async function PostalCodesPage({
  params,
}: PostalCodesPageProps) {
  const { granularity } = await params;

  return (
    <div className="h-full px-4 lg:px-6">
      <PostalCodesErrorBoundary>
        <Suspense fallback={<PostalCodesViewSkeleton />}>
          <ServerPostalCodesView defaultGranularity={granularity} />
        </Suspense>
      </PostalCodesErrorBoundary>
    </div>
  );
}
