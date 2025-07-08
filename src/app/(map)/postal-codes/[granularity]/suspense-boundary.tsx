import { MapLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Suspense } from "react";

export function MapSuspenseBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<MapLoadingSkeleton className="h-full w-full" />}>{children}</Suspense>;
}
