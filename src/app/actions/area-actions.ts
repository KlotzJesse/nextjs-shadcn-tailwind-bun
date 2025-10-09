"use server";

import { db } from "../../lib/db";
import {
  areas,
  areaLayers,
  areaLayerPostalCodes,
} from "../../lib/schema/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { recordChangeAction } from "./change-tracking-actions";
import { createVersionAction } from "./version-actions";

type ServerActionResponse<T = void> = Promise<{
  success: boolean;
  data?: T;
  error?: string;
}>;

// ===============================
// AREA OPERATIONS
// ===============================

export async function getAreasAction(): ServerActionResponse<any[]> {
  try {
    const result = await db.query.areas.findMany({
      orderBy: (areas, { desc }) => [desc(areas.updatedAt)],
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching areas:", error);
    return { success: false, error: "Failed to fetch areas" };
  }
}

export async function createAreaAction(data: {
  name: string;
  description?: string;
  granularity?: string;
  createdBy?: string;
}): ServerActionResponse<{ id: number }> {
  try {
    // Create the area first
    const [area] = await db
      .insert(areas)
      .values({
        name: data.name,
        description: data.description,
        granularity: data.granularity || "5digit",
      })
      .returning();

    // Create the first version automatically
    const versionResult = await createVersionAction(area.id, {
      name: "Initial Version",
      description: "Automatically created first version",
      createdBy: data.createdBy,
    });

    if (!versionResult.success) {
      // If version creation fails, we should clean up the area
      await db.delete(areas).where(eq(areas.id, area.id));
      throw new Error("Failed to create initial version");
    }

    revalidatePath("/postal-codes");
    revalidateTag("areas");
    revalidateTag(`area-${area.id}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${area.id}-undo-redo`);
    return { success: true, data: { id: area.id } };
  } catch (error) {
    console.error("Error creating area:", error);
    return { success: false, error: "Failed to create area" };
  }
}

export async function updateAreaAction(
  id: number,
  data: {
    name?: string;
    description?: string;
    granularity?: string;
  },
  createdBy?: string
): ServerActionResponse {
  try {
    // Get previous state
    const previousArea = await db.query.areas.findFirst({
      where: eq(areas.id, id),
    });

    await db
      .update(areas)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(areas.id, id));

    // Record change
    await recordChangeAction(id, {
      changeType: "update_area",
      entityType: "area",
      entityId: id,
      changeData: data,
      previousData: previousArea
        ? {
            name: previousArea.name,
            description: previousArea.description,
            granularity: previousArea.granularity,
          }
        : undefined,
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("areas");
    revalidateTag(`area-${id}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${id}-undo-redo`);
    return { success: true };
  } catch (error) {
    console.error("Error updating area:", error);
    return { success: false, error: "Failed to update area" };
  }
}

export async function deleteAreaAction(id: number): ServerActionResponse {
  try {
    // Delete in correct order due to foreign key constraints
    await db.transaction(async (tx) => {
      // First delete all postal codes from layers in this area
      const areaLayerIds = await tx
        .select({ id: areaLayers.id })
        .from(areaLayers)
        .where(eq(areaLayers.areaId, id));

      if (areaLayerIds.length > 0) {
        await tx.delete(areaLayerPostalCodes).where(
          inArray(
            areaLayerPostalCodes.layerId,
            areaLayerIds.map((l) => l.id)
          )
        );

        // Then delete the layers
        await tx.delete(areaLayers).where(eq(areaLayers.areaId, id));
      }

      // Finally delete the area
      await tx.delete(areas).where(eq(areas.id, id));
    });

    revalidatePath("/postal-codes");
    revalidateTag("areas");
    return { success: true };
  } catch (error) {
    console.error("Error deleting area:", error);
    return { success: false, error: "Failed to delete area" };
  }
}

export async function getAreaByIdAction(id: number): ServerActionResponse<any> {
  try {
    const area = await db.query.areas.findFirst({
      where: eq(areas.id, id),
      with: {
        layers: {
          with: {
            postalCodes: true,
          },
          orderBy: (layers, { asc }) => [asc(layers.orderIndex)],
        },
      },
    });

    if (!area) {
      return { success: false, error: "Area not found" };
    }

    return { success: true, data: area };
  } catch (error) {
    console.error("Error fetching area:", error);
    return { success: false, error: "Failed to fetch area" };
  }
}

// ===============================
// LAYER OPERATIONS
// ===============================

export async function getLayersAction(
  areaId: number
): ServerActionResponse<any[]> {
  try {
    const result = await db.query.areaLayers.findMany({
      where: eq(areaLayers.areaId, areaId),
      with: {
        postalCodes: true,
      },
      orderBy: (layers, { asc }) => [asc(layers.orderIndex)],
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching layers:", error);
    return { success: false, error: "Failed to fetch layers" };
  }
}

export async function createLayerAction(
  areaId: number,
  data: {
    name: string;
    color: string;
    opacity: number;
    isVisible: boolean;
    orderIndex: number;
  },
  createdBy?: string
): ServerActionResponse<{ id: number }> {
  try {
    const [layer] = await db
      .insert(areaLayers)
      .values({
        areaId,
        name: data.name,
        color: data.color,
        opacity: data.opacity,
        isVisible: data.isVisible ? "true" : "false",
        orderIndex: data.orderIndex,
      })
      .returning();

    // Record change
    await recordChangeAction(areaId, {
      changeType: "create_layer",
      entityType: "layer",
      entityId: layer.id,
      changeData: {
        layer: {
          areaId,
          name: data.name,
          color: data.color,
          opacity: data.opacity,
          isVisible: data.isVisible ? "true" : "false",
          orderIndex: data.orderIndex,
        },
      },
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("layers");
    revalidateTag(`area-${areaId}-layers`);
    revalidateTag(`area-${areaId}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${areaId}-undo-redo`);
    return { success: true, data: { id: layer.id } };
  } catch (error) {
    console.error("Error creating layer:", error);
    return { success: false, error: "Failed to create layer" };
  }
}

export async function updateLayerAction(
  areaId: number,
  layerId: number,
  data: {
    name?: string;
    color?: string;
    opacity?: number;
    isVisible?: boolean;
    orderIndex?: number;
    postalCodes?: string[];
  },
  createdBy?: string
): ServerActionResponse {
  try {
    // Get previous state
    const previousLayer = await db.query.areaLayers.findFirst({
      where: eq(areaLayers.id, layerId),
      with: { postalCodes: true },
    });

    await db.transaction(async (tx) => {
      // Update layer properties
      if (
        data.name !== undefined ||
        data.color !== undefined ||
        data.opacity !== undefined ||
        data.isVisible !== undefined ||
        data.orderIndex !== undefined
      ) {
        await tx
          .update(areaLayers)
          .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.opacity !== undefined && { opacity: data.opacity }),
            ...(data.isVisible !== undefined && {
              isVisible: data.isVisible ? "true" : "false",
            }),
            ...(data.orderIndex !== undefined && {
              orderIndex: data.orderIndex,
            }),
          })
          .where(eq(areaLayers.id, layerId));
      }

      // Update postal codes if provided
      if (data.postalCodes !== undefined) {
        // Delete existing postal codes
        await tx
          .delete(areaLayerPostalCodes)
          .where(eq(areaLayerPostalCodes.layerId, layerId));

        // Insert new postal codes
        if (data.postalCodes.length > 0) {
          await tx.insert(areaLayerPostalCodes).values(
            data.postalCodes.map((code) => ({
              layerId,
              postalCode: code,
            }))
          );
        }
      }
    });

    // Record change
    const changeData: any = {};
    const previousData: any = {};

    if (data.name !== undefined) {
      changeData.name = data.name;
      previousData.name = previousLayer?.name;
    }
    if (data.color !== undefined) {
      changeData.color = data.color;
      previousData.color = previousLayer?.color;
    }
    if (data.opacity !== undefined) {
      changeData.opacity = data.opacity;
      previousData.opacity = previousLayer?.opacity;
    }
    if (data.isVisible !== undefined) {
      changeData.isVisible = data.isVisible ? "true" : "false";
      previousData.isVisible = previousLayer?.isVisible;
    }
    if (data.orderIndex !== undefined) {
      changeData.orderIndex = data.orderIndex;
      previousData.orderIndex = previousLayer?.orderIndex;
    }
    if (data.postalCodes !== undefined) {
      changeData.postalCodes = data.postalCodes;
      previousData.postalCodes =
        previousLayer?.postalCodes?.map((pc) => pc.postalCode) || [];
    }

    await recordChangeAction(areaId, {
      changeType: "update_layer",
      entityType: "layer",
      entityId: layerId,
      changeData,
      previousData,
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("layers");
    revalidateTag(`area-${areaId}-layers`);
    revalidateTag(`area-${areaId}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${areaId}-undo-redo`);
    return { success: true };
  } catch (error) {
    console.error("Error updating layer:", error);
    return { success: false, error: "Failed to update layer" };
  }
}

export async function deleteLayerAction(
  areaId: number,
  layerId: number,
  createdBy?: string
): ServerActionResponse {
  try {
    // Get layer data before deletion
    const layer = await db.query.areaLayers.findFirst({
      where: eq(areaLayers.id, layerId),
      with: {
        postalCodes: true,
      },
    });

    if (!layer) {
      return { success: false, error: "Layer not found" };
    }

    await db.transaction(async (tx) => {
      // Delete postal codes first
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerId));

      // Delete layer
      await tx.delete(areaLayers).where(eq(areaLayers.id, layerId));
    });

    // Record change
    await recordChangeAction(areaId, {
      changeType: "delete_layer",
      entityType: "layer",
      entityId: layerId,
      changeData: {},
      previousData: {
        layer: {
          id: layer.id,
          areaId: layer.areaId,
          name: layer.name,
          color: layer.color,
          opacity: layer.opacity,
          isVisible: layer.isVisible,
          orderIndex: layer.orderIndex,
        },
        postalCodes: layer.postalCodes?.map((pc) => pc.postalCode) || [],
      },
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("layers");
    revalidateTag(`area-${areaId}-layers`);
    revalidateTag(`area-${areaId}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${areaId}-undo-redo`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting layer:", error);
    return { success: false, error: "Failed to delete layer" };
  }
}

export async function addPostalCodesToLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[],
  createdBy?: string
): ServerActionResponse {
  try {
    // Validate inputs
    if (!areaId || !layerId || !postalCodes || postalCodes.length === 0) {
      return { success: false, error: "Invalid parameters" };
    }

    // Verify layer belongs to area
    const layer = await db.query.areaLayers.findFirst({
      where: and(eq(areaLayers.id, layerId), eq(areaLayers.areaId, areaId)),
      with: { postalCodes: true },
    });

    if (!layer) {
      return {
        success: false,
        error: "Layer not found or does not belong to area",
      };
    }

    // Get existing postal codes
    const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
    const newCodes = postalCodes.filter(
      (code) => !existingCodes.includes(code)
    );

    if (newCodes.length === 0) {
      return { success: true }; // No new codes to add
    }

    await db.insert(areaLayerPostalCodes).values(
      newCodes.map((code) => ({
        layerId,
        postalCode: code,
      }))
    );

    // Record change
    await recordChangeAction(areaId, {
      changeType: "add_postal_codes",
      entityType: "postal_code",
      entityId: layerId,
      changeData: {
        postalCodes: newCodes,
        layerId,
      },
      previousData: {
        postalCodes: existingCodes,
      },
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("layers");
    revalidateTag(`area-${areaId}-layers`);
    revalidateTag(`area-${areaId}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${areaId}-undo-redo`);
    return { success: true };
  } catch (error) {
    console.error("Error adding postal codes to layer:", error);
    return { success: false, error: "Failed to add postal codes to layer" };
  }
}

export async function removePostalCodesFromLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[],
  createdBy?: string
): ServerActionResponse {
  try {
    // Validate inputs
    if (!areaId || !layerId || !postalCodes || postalCodes.length === 0) {
      return { success: false, error: "Invalid parameters" };
    }

    // Verify layer belongs to area
    const layer = await db.query.areaLayers.findFirst({
      where: and(eq(areaLayers.id, layerId), eq(areaLayers.areaId, areaId)),
      with: { postalCodes: true },
    });

    if (!layer) {
      return {
        success: false,
        error: "Layer not found or does not belong to area",
      };
    }

    const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
    const codesToRemove = postalCodes.filter((code) =>
      existingCodes.includes(code)
    );

    if (codesToRemove.length === 0) {
      return { success: true }; // No codes to remove
    }

    await db
      .delete(areaLayerPostalCodes)
      .where(
        and(
          eq(areaLayerPostalCodes.layerId, layerId),
          inArray(areaLayerPostalCodes.postalCode, postalCodes)
        )
      );

    // Record change
    await recordChangeAction(areaId, {
      changeType: "remove_postal_codes",
      entityType: "postal_code",
      entityId: layerId,
      changeData: {
        postalCodes: codesToRemove,
        layerId,
      },
      previousData: {
        postalCodes: codesToRemove, // Store removed codes for undo
      },
      createdBy,
    });

    revalidatePath("/postal-codes");
    revalidateTag("layers");
    revalidateTag(`area-${areaId}-layers`);
    revalidateTag(`area-${areaId}`);
    revalidateTag("undo-redo");
    revalidateTag(`area-${areaId}-undo-redo`);
    return { success: true };
  } catch (error) {
    console.error("Error removing postal codes from layer:", error);
    return {
      success: false,
      error: "Failed to remove postal codes from layer",
    };
  }
}

// ===============================
// GEOPROCESSING OPERATIONS
// ===============================

export async function geoprocessAction(data: {
  mode: "all" | "holes" | "expand";
  granularity: string;
  selectedCodes: string[];
}): ServerActionResponse<{ resultCodes: string[] }> {
  try {
    // This would typically call your existing geoprocessing API
    // For now, I'll simulate the same logic but on the server
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/geoprocess`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Geoprocessing failed");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in geoprocessing:", error);
    return { success: false, error: "Geoprocessing failed" };
  }
}

// ===============================
// SEARCH OPERATIONS
// ===============================

export async function radiusSearchAction(data: {
  latitude: number;
  longitude: number;
  radius: number;
  granularity: string;
}): ServerActionResponse<{ postalCodes: string[] }> {
  try {
    const response = await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/radius-search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Radius search failed");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in radius search:", error);
    return { success: false, error: "Radius search failed" };
  }
}

export async function drivingRadiusSearchAction(data: {
  latitude: number;
  longitude: number;
  maxDuration: number;
  granularity: string;
}): ServerActionResponse<{ postalCodes: string[] }> {
  try {
    const response = await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/driving-radius-search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Driving radius search failed");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in driving radius search:", error);
    return { success: false, error: "Driving radius search failed" };
  }
}

export async function geocodeAction(address: string): ServerActionResponse<{
  latitude: number;
  longitude: number;
  postalCode?: string;
}> {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/geocode`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in geocoding:", error);
    return { success: false, error: "Geocoding failed" };
  }
}
