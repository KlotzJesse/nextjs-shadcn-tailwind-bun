"use server";

import { db } from "../../lib/db";
import {
  areas,
  areaLayers,
  areaLayerPostalCodes,
} from "../../lib/schema/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
}): ServerActionResponse<{ id: number }> {
  try {
    const [area] = await db
      .insert(areas)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning();

    revalidatePath("/postal-codes");
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
  }
): ServerActionResponse {
  try {
    await db
      .update(areas)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(areas.id, id));

    revalidatePath("/postal-codes");
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
  }
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

    revalidatePath("/postal-codes");
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
  }
): ServerActionResponse {
  try {
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

    revalidatePath("/postal-codes");
    return { success: true };
  } catch (error) {
    console.error("Error updating layer:", error);
    return { success: false, error: "Failed to update layer" };
  }
}

export async function deleteLayerAction(
  areaId: number,
  layerId: number
): ServerActionResponse {
  try {
    await db.transaction(async (tx) => {
      // Delete postal codes first
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerId));

      // Delete layer
      await tx.delete(areaLayers).where(eq(areaLayers.id, layerId));
    });

    revalidatePath("/postal-codes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting layer:", error);
    return { success: false, error: "Failed to delete layer" };
  }
}

export async function addPostalCodesToLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[]
): ServerActionResponse {
  try {
    // Validate inputs
    if (!areaId || !layerId || !postalCodes || postalCodes.length === 0) {
      return { success: false, error: "Invalid parameters" };
    }

    // Verify layer belongs to area
    const layer = await db.query.areaLayers.findFirst({
      where: and(
        eq(areaLayers.id, layerId),
        eq(areaLayers.areaId, areaId)
      ),
    });

    if (!layer) {
      return { success: false, error: "Layer not found or does not belong to area" };
    }

    // Get existing postal codes
    const existing = await db
      .select({ postalCode: areaLayerPostalCodes.postalCode })
      .from(areaLayerPostalCodes)
      .where(eq(areaLayerPostalCodes.layerId, layerId));

    const existingCodes = existing.map((e) => e.postalCode);
    const newCodes = postalCodes.filter(
      (code) => !existingCodes.includes(code)
    );

    if (newCodes.length > 0) {
      await db.insert(areaLayerPostalCodes).values(
        newCodes.map((code) => ({
          layerId,
          postalCode: code,
        }))
      );
    }

    revalidatePath("/postal-codes");
    return { success: true };
  } catch (error) {
    console.error("Error adding postal codes to layer:", error);
    return { success: false, error: "Failed to add postal codes to layer" };
  }
}

export async function removePostalCodesFromLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[]
): ServerActionResponse {
  try {
    // Validate inputs
    if (!areaId || !layerId || !postalCodes || postalCodes.length === 0) {
      return { success: false, error: "Invalid parameters" };
    }

    // Verify layer belongs to area
    const layer = await db.query.areaLayers.findFirst({
      where: and(
        eq(areaLayers.id, layerId),
        eq(areaLayers.areaId, areaId)
      ),
    });

    if (!layer) {
      return { success: false, error: "Layer not found or does not belong to area" };
    }

    await db
      .delete(areaLayerPostalCodes)
      .where(
        and(
          eq(areaLayerPostalCodes.layerId, layerId),
          inArray(areaLayerPostalCodes.postalCode, postalCodes)
        )
      );

    revalidatePath("/postal-codes");
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
