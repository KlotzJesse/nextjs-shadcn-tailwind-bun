import { PostalCodesErrorBoundary } from "@/components/ui/error-boundaries";
import { PostalCodesViewSkeleton } from "@/components/ui/loading-skeletons";
import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { areas, areaVersions } from "@/lib/schema/schema";
import { eq } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

const ServerPostalCodesView = nextDynamic(
  () => import("@/components/postal-codes/server-postal-codes-view"),
  {
    loading: () => <PostalCodesViewSkeleton />,
    ssr: true,
  }
);

export const experimental_ppr = true;

const VALID_GRANULARITIES = ["1digit", "2digit", "3digit", "5digit"] as const;
type Granularity = (typeof VALID_GRANULARITIES)[number];

interface PostalCodesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: PostalCodesPageProps): Promise<Metadata> {
  const params = await searchParams;

  // Get granularity from area or version
  let granularity = "1digit";

  if (params.areaId) {
    const areaIdValue = Array.isArray(params.areaId)
      ? params.areaId[0]
      : params.areaId;
    const areaId = parseInt(areaIdValue, 10);

    if (!isNaN(areaId)) {
      try {
        // Check if viewing a version
        if (params.versionId) {
          const versionIdValue = Array.isArray(params.versionId)
            ? params.versionId[0]
            : params.versionId;
          const versionId = parseInt(versionIdValue, 10);

          if (!isNaN(versionId)) {
            const version = await db.query.areaVersions.findFirst({
              where: eq(areaVersions.id, versionId),
            });

            if (version && version.snapshot) {
              const snapshot = version.snapshot as { granularity?: string };
              granularity = snapshot.granularity || "1digit";
            }
          }
        } else {
          // Get granularity from area
          const area = await db.query.areas.findFirst({
            where: eq(areas.id, areaId),
          });

          if (area && area.granularity) {
            granularity = area.granularity;
          }
        }
      } catch (error) {
        console.error("Failed to fetch granularity:", error);
      }
    }
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
  searchParams,
}: PostalCodesPageProps) {
  await connection();
  const search = await searchParams;

  // Extract area and layer IDs from search params
  const areaId = search.areaId ? parseInt(search.areaId as string, 10) : null;
  const activeLayerId = search.activeLayerId
    ? parseInt(search.activeLayerId as string, 10)
    : null;
  const versionId = search.versionId
    ? parseInt(search.versionId as string, 10)
    : null;

  // Determine granularity from area or version
  let granularity: string = "1digit";

  if (areaId && areaId > 0) {
    try {
      // Check if viewing a version
      if (versionId && versionId > 0) {
        const version = await db.query.areaVersions.findFirst({
          where: eq(areaVersions.id, versionId),
        });

        if (version && version.snapshot) {
          const snapshot = version.snapshot as { granularity?: string };
          granularity = snapshot.granularity || "1digit";
        }
      } else {
        // Get granularity from current area
        const area = await db.query.areas.findFirst({
          where: eq(areas.id, areaId),
        });

        if (area && area.granularity) {
          granularity = area.granularity;
        }
      }
    } catch (error) {
      console.error("Failed to fetch granularity:", error);
    }
  }

  return (
    <>
      <Suspense fallback={<Skeleton className="w-full h-12" />}>
        <SiteHeader areaId={areaId} />
      </Suspense>
      <div className="h-full px-4 lg:px-6">
        <PostalCodesErrorBoundary>
          <Suspense fallback={<PostalCodesViewSkeleton />}>
            <ServerPostalCodesView
              defaultGranularity={granularity}
              areaId={areaId}
              activeLayerId={activeLayerId}
              versionId={versionId}
            />
          </Suspense>
        </PostalCodesErrorBoundary>
      </div>
    </>
  );
}
