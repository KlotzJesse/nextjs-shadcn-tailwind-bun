"use server";

import { db } from "../../lib/db";
import { areaLayers, areaLayerPostalCodes } from "../../lib/schema/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createLayerAction(
  areaId: number,
  data: {
    name: string;
    color?: string;
    opacity?: number;
    isVisible?: string;
    orderIndex?: number;
  }
) {
  try {
    const [layer] = await db
      .insert(areaLayers)
      .values({
        areaId,
        name: data.name,
        color: data.color || "#3b82f6",
        opacity: data.opacity ?? 80,
        isVisible: data.isVisible || "true",
        orderIndex: data.orderIndex ?? 0,
      })
      .returning();

    revalidatePath(`/postal-codes`);
    return { success: true, layer };
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
    isVisible?: string;
    orderIndex?: number;
    postalCodes?: string[];
  }
) {
  try {
    await db.transaction(async (tx) => {
      // Update layer properties
      const updates: Record<string, string | number> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.color !== undefined) updates.color = data.color;
      if (data.opacity !== undefined) updates.opacity = data.opacity;
      if (data.isVisible !== undefined) updates.isVisible = data.isVisible;
      if (data.orderIndex !== undefined) updates.orderIndex = data.orderIndex;

      if (Object.keys(updates).length > 0) {
        await tx
          .update(areaLayers)
          .set(updates)
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
            data.postalCodes.map((code: string) => ({
              layerId: layerId,
              postalCode: code,
            }))
          );
        }
      }
    });

    revalidatePath(`/postal-codes`);
    return { success: true };
  } catch (error) {
    console.error("Error updating layer:", error);
    return { success: false, error: "Failed to update layer" };
  }
}

export async function deleteLayerAction(areaId: number, layerId: number) {
  try {
    await db.transaction(async (tx) => {
      // Delete postal codes first (foreign key constraint)
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerId));

      // Delete the layer
      await tx.delete(areaLayers).where(eq(areaLayers.id, layerId));
    });

    revalidatePath(`/postal-codes`);
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
) {
  try {
    // Get existing postal codes for this layer
    const layer = await db.query.areaLayers.findFirst({
      where: eq(areaLayers.id, layerId),
      with: {
        postalCodes: true,
      },
    });

    if (!layer) {
      return { success: false, error: "Layer not found" };
    }

    const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
    const newCodes = Array.from(new Set([...existingCodes, ...postalCodes]));

    // Update with combined postal codes
    await db.transaction(async (tx) => {
      // Delete existing postal codes
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerId));

      // Insert all postal codes (existing + new)
      if (newCodes.length > 0) {
        await tx.insert(areaLayerPostalCodes).values(
          newCodes.map((code) => ({
            layerId: layerId,
            postalCode: code,
          }))
        );
      }
    });

    revalidatePath(`/postal-codes`);
    return { success: true };
  } catch (error) {
    console.error("Error adding postal codes to layer:", error);
    return { success: false, error: "Failed to add postal codes" };
  }
}

export async function removePostalCodesFromLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[]
) {
  try {
    // Get existing postal codes for this layer
    const layer = await db.query.areaLayers.findFirst({
      where: eq(areaLayers.id, layerId),
      with: {
        postalCodes: true,
      },
    });

    if (!layer) {
      return { success: false, error: "Layer not found" };
    }

    const existingCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];
    const newCodes = existingCodes.filter(
      (code) => !postalCodes.includes(code)
    );

    // Update with filtered postal codes
    await db.transaction(async (tx) => {
      // Delete existing postal codes
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerId));

      // Insert remaining postal codes
      if (newCodes.length > 0) {
        await tx.insert(areaLayerPostalCodes).values(
          newCodes.map((code) => ({
            layerId: layerId,
            postalCode: code,
          }))
        );
      }
    });

    revalidatePath(`/postal-codes`);
    return { success: true };
  } catch (error) {
    console.error("Error removing postal codes from layer:", error);
    return { success: false, error: "Failed to remove postal codes" };
  }
}
