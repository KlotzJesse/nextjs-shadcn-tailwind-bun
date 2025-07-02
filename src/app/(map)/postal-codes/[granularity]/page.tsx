import { Suspense } from "react";
import { Metadata } from "next";
import { PostalCodesClient } from "@/components/postal-codes/postal-codes-client";
import { getPostalCodesDataForGranularityServer } from "@/lib/utils/postal-codes-data";
import { getStatesDataServer } from "@/lib/utils/states-data";
import { notFound } from "next/navigation";
import { POSTAL_CODE_GRANULARITIES, Granularity } from "@/lib/types";

interface PostalCodesPageProps {
  params: Promise<{ granularity: string }>;
}


export async function generateMetadata({
  params,
}: PostalCodesPageProps): Promise<Metadata> {
  const { granularity } = await params;

  if (!POSTAL_CODE_GRANULARITIES.includes(granularity as Granularity)) {
    return {
      title: "KRAUSS Territory Management - Postal Codes",
      description:
        "Interactive territory management for German postal code regions",
    };
  }

  const displayName = granularity
    .replace("plz-", "PLZ ")
    .replace("stellig", "-digit");

  return {
    title: `KRAUSS Territory Management - ${displayName} Postal Codes`,
    description: `Interactive territory management for German postal code regions with ${displayName} granularity`,
    openGraph: {
      title: `KRAUSS Territory Management - ${displayName} Postal Codes`,
      description: `Interactive territory management for German postal code regions with ${displayName} granularity`,
      type: "website",
    },
    keywords: [
      "territory management",
      "postal codes",
      "Germany",
      "mapping",
      granularity,
    ],
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PostalCodesPage({
  params,
}: PostalCodesPageProps) {
  const { granularity } = await params;

  if (!POSTAL_CODE_GRANULARITIES.includes(granularity as Granularity)) {
    notFound();
  }

  try {
    // Fetch both postal codes data and states data on the server
    const [postalCodesData, statesData] = await Promise.all([
      getPostalCodesDataForGranularityServer(granularity, {
        // Optimize for performance - reduce precision for large datasets
        simplifyTolerance: granularity === "plz-5stellig" ? 0.002 : 0.001,
      }),
      getStatesDataServer(),
    ]);

    if (!postalCodesData) {
      notFound();
    }

    return (
      <div className="h-full">
        <Suspense fallback={<PostalCodesLoading />}>
          <PostalCodesClient
            initialData={postalCodesData}
            statesData={statesData}
            granularity={granularity as Granularity}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Error loading postal codes data:", error);
    notFound();
  }
}

function PostalCodesLoading() {
  return (
    <div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-3 space-y-4">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="col-span-9">
        <div className="h-full bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
