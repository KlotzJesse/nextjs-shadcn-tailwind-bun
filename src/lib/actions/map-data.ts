"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ServerActionResult,
  MapData,
  Granularity,
  FilterOptions,
  ExportOptions,
} from "@/lib/types";
import { getPostalCodesDataForGranularityServer } from "@/lib/utils/postal-codes-data";
import { getStatesDataServer } from "@/lib/utils/states-data";
import {
  exportPostalCodesXLSX,
  copyPostalCodesCSV,
} from "@/lib/utils/export-utils";

/**
 * Server action to fetch postal codes data with caching
 */
export async function fetchPostalCodesAction(
  granularity: Granularity,
  options?: FilterOptions
): Promise<ServerActionResult<MapData>> {
  try {
    const data = await getPostalCodesDataForGranularityServer(
      granularity,
      options
    );

    if (!data) {
      return {
        success: false,
        error: "Failed to fetch postal codes data",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Server action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server action to fetch states data with caching
 */
export async function fetchStatesAction(): Promise<
  ServerActionResult<MapData>
> {
  try {
    const data = await getStatesDataServer();

    if (!data) {
      return {
        success: false,
        error: "Failed to fetch states data",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Server action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Server action to export postal codes data
 */
export async function exportPostalCodesAction(
  postalCodes: string[],
  options: ExportOptions
): Promise<ServerActionResult<{ downloadUrl?: string; csvData?: string }>> {
  try {
    if (postalCodes.length === 0) {
      return {
        success: false,
        error: "No postal codes selected for export",
      };
    }

    switch (options.format) {
      case "xlsx":
        await exportPostalCodesXLSX(postalCodes);
        return {
          success: true,
          data: { downloadUrl: "download-started" },
        };

      case "csv":
        await copyPostalCodesCSV(postalCodes);
        return {
          success: true,
          data: { csvData: "copied-to-clipboard" },
        };

      default:
        return {
          success: false,
          error: "Unsupported export format",
        };
    }
  } catch (error) {
    console.error("Export error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Server action to revalidate cached data
 */
export async function revalidateMapDataAction(
  tags: string[] = ["postal-codes", "states"]
): Promise<ServerActionResult<void>> {
  try {
    tags.forEach((tag) => revalidateTag(tag));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Revalidation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Revalidation failed",
    };
  }
}

/**
 * Server action to navigate to postal codes with specific granularity
 */
export async function navigateToPostalCodesAction(
  granularity: Granularity
): Promise<never> {
  redirect(`/postal-codes/${granularity}`);
}

/**
 * Server action to save user preferences
 */
export async function saveUserPreferencesAction(preferences: {
  defaultGranularity?: Granularity;
  theme?: "light" | "dark" | "system";
  performanceMode?: boolean;
}): Promise<ServerActionResult<void>> {
  try {
    // In a real app, you would save this to a database or cookies
    // For now, we'll just return success
    console.log("Saving user preferences:", preferences);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Save preferences error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save preferences",
    };
  }
}

/**
 * Server action to handle bulk operations on postal codes
 */
export async function bulkPostalCodeAction(
  operation: "select" | "deselect" | "export",
  postalCodes: string[]
): Promise<ServerActionResult<{ processed: number }>> {
  try {
    if (postalCodes.length === 0) {
      return {
        success: false,
        error: "No postal codes provided",
      };
    }

    // Process the operation (this would interact with database in real app)
    const processed = postalCodes.length;

    console.log(`Bulk ${operation} operation on ${processed} postal codes`);

    return {
      success: true,
      data: { processed },
    };
  } catch (error) {
    console.error("Bulk operation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bulk operation failed",
    };
  }
}
