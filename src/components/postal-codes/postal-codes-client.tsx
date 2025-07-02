"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapData, Granularity } from "@/lib/types";
import { PostalCodesView } from "./postal-codes-view";
import { ErrorBoundary } from "@/components/shared/error-boundary";

interface PostalCodesClientProps {
  initialData: MapData;
  granularity: Granularity;
  statesData?: MapData | null;
}

function PostalCodesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 h-full p-4">
      {/* Sidebar Skeletons */}
      <div className="col-span-3 space-y-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>

      {/* Map Skeleton */}
      <div className="col-span-9">
        <Skeleton className="h-full rounded-lg" />
      </div>
    </div>
  );
}

function PostalCodesContent({
  initialData,
  granularity,
  statesData,
}: PostalCodesClientProps) {
  return (
    <PostalCodesView
      initialData={initialData}
      defaultGranularity={granularity}
      statesData={statesData}
    />
  );
}

export function PostalCodesClient({
  initialData,
  granularity,
  statesData,
}: PostalCodesClientProps) {
  return (
    <div className="h-full">
      <ErrorBoundary>
        <Suspense fallback={<PostalCodesLoadingSkeleton />}>
          <PostalCodesContent
            initialData={initialData}
            granularity={granularity}
            statesData={statesData}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
