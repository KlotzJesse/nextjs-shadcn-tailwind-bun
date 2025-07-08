import ServerPostalCodesView from "@/components/postal-codes/server-postal-codes-view";
import { Metadata } from "next";
import { Suspense } from "react";

export const experimental_ppr = true;

const VALID_GRANULARITIES = [
  "1digit",
  "2digit",
  "3digit",
  "5digit",
] as const;

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
      <Suspense fallback={<PostalCodesLoading />}>
        <ServerPostalCodesView defaultGranularity={granularity} />
      </Suspense>
    </div>
  );
}

function PostalCodesLoading() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 @container/main:h-full h-full">
      <div className="col-span-3 space-y-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="col-span-9">
        <div className="h-full bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
