import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for main page cards
export function HomePageSkeleton() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-96 mb-2" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for postal codes view
export function PostalCodesViewSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 h-full">
      <div className="col-span-3 space-y-4">
        {/* Address search skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>

        {/* Drawing tools skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-9">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  );
}

// Loading skeleton for map component
export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}

// Loading skeleton for drawing tools
export function DrawingToolsSkeleton() {
  return (
    <Card className="w-56">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for address autocomplete
export function AddressAutocompleteSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}
