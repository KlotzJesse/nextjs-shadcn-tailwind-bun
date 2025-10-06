import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function LayerManagementSkeleton() {
  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between h-7 px-2 text-xs"
        disabled
      >
        <span className="font-medium">Ebenen</span>
        <ChevronDown className="h-3 w-3" />
      </Button>
      <div className="space-y-1 pt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-2 rounded border border-border">
            <div className="flex items-center gap-1 mb-1">
              <Skeleton className="w-3 h-3 rounded-sm" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-6 h-5 rounded" />
              <Skeleton className="h-2 flex-1" />
              <Skeleton className="w-8 h-3" />
            </div>
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        ))}
        <Skeleton className="w-full h-7" />
      </div>
    </div>
  );
}
