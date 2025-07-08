import { Skeleton } from "./skeleton";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="w-full h-40 mb-4" />
      <Skeleton className="w-1/2 h-6 mb-2" />
      <Skeleton className="w-1/3 h-6" />
    </div>
  );
}

export function MapLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="w-full h-96 rounded-lg" />
    </div>
  );
}
