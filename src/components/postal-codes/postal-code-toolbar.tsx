"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Granularity } from "@/lib/types";
import { POSTAL_CODE_GRANULARITIES } from "@/lib/types";
import { useMapSelection } from "@/lib/providers/map-provider";
import { exportRegionsAction } from "@/lib/actions/postal-codes";

interface ToolbarProps {
  currentGranularity: Granularity;
  className?: string;
}

export function PostalCodeToolbar({
  currentGranularity,
  className,
}: ToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const { selectedRegions, selectedCount, clearSelection, hasSelection } =
    useMapSelection();

  const handleGranularityChange = (newGranularity: string) => {
    if (newGranularity !== currentGranularity) {
      startTransition(() => {
        router.push(`/postal-codes/${newGranularity}`);
      });
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "json") => {
    if (!hasSelection) {
      toast.error("Please select regions to export");
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportRegionsAction(selectedRegions, format);

      if (result.success) {
        toast.success(result.message);
        // In a real app, trigger download here
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearSelection = () => {
    clearSelection();
    toast.success("Selection cleared");
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Postal Code Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Granularity Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Granularity</label>
          <Select
            value={currentGranularity}
            onValueChange={handleGranularityChange}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
              {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </SelectTrigger>
            <SelectContent>
              {POSTAL_CODE_GRANULARITIES.map((granularity) => (
                <SelectItem key={granularity} value={granularity}>
                  {granularity
                    .replace("plz-", "PLZ ")
                    .replace("stellig", "-digit")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Selection Info */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Selected Regions</p>
            <div className="flex items-center gap-2">
              <Badge variant={hasSelection ? "default" : "secondary"}>
                {selectedCount} selected
              </Badge>
              {hasSelection && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="h-6 w-6 p-0"
                      >
                        <EyeOff className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear selection</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full"
                disabled={!hasSelection || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export ({selectedCount})
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Selection with Confirmation */}
          {hasSelection && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Selection</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to clear the selection of{" "}
                    {selectedCount} regions? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearSelection}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear Selection
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Additional Actions */}
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Map Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Options
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Reset View</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
