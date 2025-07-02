"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { MapData, Granularity } from "@/lib/types";
import { POSTAL_CODE_GRANULARITIES } from "@/lib/types";
import { getPostalCodesDataForGranularityServer } from "@/lib/utils/postal-codes-data";

/**
 * Server action to change postal code granularity
 */
export async function changeGranularityAction(granularity: string) {
  if (!POSTAL_CODE_GRANULARITIES.includes(granularity as Granularity)) {
    throw new Error("Invalid granularity");
  }

  redirect(`/postal-codes/${granularity}`);
}

/**
 * Server action to refresh postal code data
 */
export async function refreshPostalCodeDataAction(granularity: string) {
  if (!POSTAL_CODE_GRANULARITIES.includes(granularity as Granularity)) {
    throw new Error("Invalid granularity");
  }

  revalidateTag(`postal-codes-${granularity}`);
  return { success: true };
}

/**
 * Server action to export selected regions
 */
export async function exportRegionsAction(
  regionIds: string[],
  format: "csv" | "xlsx" | "json"
) {
  try {
    // In a real app, this would generate the export file
    // For now, we'll just validate the input
    if (!regionIds.length) {
      throw new Error("No regions selected for export");
    }

    if (!["csv", "xlsx", "json"].includes(format)) {
      throw new Error("Invalid export format");
    }

    // Simulate export processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      message: `Exported ${
        regionIds.length
      } regions as ${format.toUpperCase()}`,
      downloadUrl: `/api/export/${format}?regions=${regionIds.join(",")}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Server action to save user preferences
 */
export async function saveUserPreferencesAction(preferences: {
  defaultGranularity?: Granularity;
  mapStyle?: string;
  autoSave?: boolean;
}) {
  try {
    // In a real app, this would save to database
    console.log("Saving user preferences:", preferences);

    return {
      success: true,
      message: "Preferences saved successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save preferences",
    };
  }
}

/**
 * Server action to validate postal code regions
 */
export async function validateRegionsAction(
  regionIds: string[],
  granularity: Granularity
) {
  try {
    const data = await getPostalCodesDataForGranularityServer(granularity);

    if (!data) {
      throw new Error("Failed to load postal code data");
    }

    const validIds = data.features
      .map((f) => f.properties.id || f.properties.PLZ || f.properties.plz)
      .filter(Boolean);

    const invalidIds = regionIds.filter((id) => !validIds.includes(id));

    return {
      success: true,
      validIds: regionIds.filter((id) => validIds.includes(id)),
      invalidIds,
      totalValid: regionIds.length - invalidIds.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
