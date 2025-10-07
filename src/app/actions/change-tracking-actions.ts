"use server";

import { db } from "../../lib/db";
import {
  areaChanges,
  areaUndoStacks,
  areaVersions,
  areas,
  areaLayers,
  areaLayerPostalCodes,
} from "../../lib/schema/schema";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ServerActionResponse<T = void> = Promise<{
  success: boolean;
  data?: T;
  error?: string;
}>;

export interface ChangeRecord {
  changeType: string;
  entityType: string;
  entityId?: number;
  changeData: any;
  previousData?: any;
  createdBy?: string;
}

// ===============================
// CHANGE RECORDING
// ===============================

/**
 * Record a change in the change tracking system
 */
export async function recordChangeAction(
  areaId: number,
  change: ChangeRecord
): ServerActionResponse<{ changeId: number }> {
  try {
    // Get the next sequence number for this area
    const lastChange = await db
      .select({ sequenceNumber: areaChanges.sequenceNumber })
      .from(areaChanges)
      .where(eq(areaChanges.areaId, areaId))
      .orderBy(desc(areaChanges.sequenceNumber))
      .limit(1);

    const nextSequence = lastChange.length > 0 ? lastChange[0].sequenceNumber + 1 : 1;

    // Get current active version if exists
    const area = await db.query.areas.findFirst({
      where: eq(areas.id, areaId),
      columns: { currentVersionId: true },
    });

    // Insert the change
    const [newChange] = await db
      .insert(areaChanges)
      .values({
        areaId,
        changeType: change.changeType,
        entityType: change.entityType,
        entityId: change.entityId,
        changeData: change.changeData,
        previousData: change.previousData,
        versionId: area?.currentVersionId || null,
        sequenceNumber: nextSequence,
        createdBy: change.createdBy,
      })
      .returning({ id: areaChanges.id });

    // Update undo stack
    await updateUndoStackAfterChange(areaId, newChange.id);

    // Update version change count if there's an active version
    if (area?.currentVersionId) {
      await db
        .update(areaVersions)
        .set({
          changeCount: sql`${areaVersions.changeCount} + 1`,
        })
        .where(eq(areaVersions.id, area.currentVersionId));
    }

    return { success: true, data: { changeId: newChange.id } };
  } catch (error) {
    console.error("Error recording change:", error);
    return { success: false, error: "Failed to record change" };
  }
}

/**
 * Update undo stack after a new change
 */
async function updateUndoStackAfterChange(
  areaId: number,
  changeId: number
): Promise<void> {
  const stack = await db.query.areaUndoStacks.findFirst({
    where: eq(areaUndoStacks.areaId, areaId),
  });

  if (!stack) {
    // Create new stack
    await db.insert(areaUndoStacks).values({
      areaId,
      undoStack: [changeId],
      redoStack: [],
    });
  } else {
    // Add to undo stack and clear redo stack
    const currentUndoStack = (stack.undoStack as number[]) || [];
    await db
      .update(areaUndoStacks)
      .set({
        undoStack: [...currentUndoStack, changeId],
        redoStack: [], // Clear redo stack when new change is made
        updatedAt: new Date().toISOString(),
      })
      .where(eq(areaUndoStacks.id, stack.id));
  }
}

// ===============================
// UNDO/REDO OPERATIONS
// ===============================

/**
 * Undo the last change
 */
export async function undoChangeAction(
  areaId: number
): ServerActionResponse<{ changeId: number }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get undo stack
      const stack = await tx.query.areaUndoStacks.findFirst({
        where: eq(areaUndoStacks.areaId, areaId),
      });

      if (!stack || !(stack.undoStack as number[]).length) {
        throw new Error("No changes to undo");
      }

      const undoStack = stack.undoStack as number[];
      const redoStack = (stack.redoStack as number[]) || [];
      const changeId = undoStack[undoStack.length - 1];

      // Get the change to undo
      const change = await tx.query.areaChanges.findFirst({
        where: eq(areaChanges.id, changeId),
      });

      if (!change) {
        throw new Error("Change not found");
      }

      // Apply the undo operation
      await applyUndoOperation(tx, change);

      // Mark change as undone
      await tx
        .update(areaChanges)
        .set({ isUndone: "true" })
        .where(eq(areaChanges.id, changeId));

      // Update stacks
      await tx
        .update(areaUndoStacks)
        .set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, changeId],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(areaUndoStacks.id, stack.id));

      return { changeId };
    });

    revalidatePath("/postal-codes");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error undoing change:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to undo change",
    };
  }
}

/**
 * Redo the last undone change
 */
export async function redoChangeAction(
  areaId: number
): ServerActionResponse<{ changeId: number }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get undo stack
      const stack = await tx.query.areaUndoStacks.findFirst({
        where: eq(areaUndoStacks.areaId, areaId),
      });

      if (!stack || !(stack.redoStack as number[]).length) {
        throw new Error("No changes to redo");
      }

      const undoStack = (stack.undoStack as number[]) || [];
      const redoStack = stack.redoStack as number[];
      const changeId = redoStack[redoStack.length - 1];

      // Get the change to redo
      const change = await tx.query.areaChanges.findFirst({
        where: eq(areaChanges.id, changeId),
      });

      if (!change) {
        throw new Error("Change not found");
      }

      // Apply the redo operation
      await applyRedoOperation(tx, change);

      // Mark change as not undone
      await tx
        .update(areaChanges)
        .set({ isUndone: "false" })
        .where(eq(areaChanges.id, changeId));

      // Update stacks
      await tx
        .update(areaUndoStacks)
        .set({
          undoStack: [...undoStack, changeId],
          redoStack: redoStack.slice(0, -1),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(areaUndoStacks.id, stack.id));

      return { changeId };
    });

    revalidatePath("/postal-codes");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error redoing change:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to redo change",
    };
  }
}

/**
 * Apply an undo operation based on change type
 */
async function applyUndoOperation(tx: any, change: any): Promise<void> {
  const { changeType, entityId, previousData, entityType } = change;

  switch (changeType) {
    case "create_layer":
      if (entityId) {
        // Delete the layer
        await tx
          .delete(areaLayerPostalCodes)
          .where(eq(areaLayerPostalCodes.layerId, entityId));
        await tx.delete(areaLayers).where(eq(areaLayers.id, entityId));
      }
      break;

    case "update_layer":
      if (entityId && previousData) {
        // Restore previous layer state
        await tx
          .update(areaLayers)
          .set(previousData)
          .where(eq(areaLayers.id, entityId));
      }
      break;

    case "delete_layer":
      if (previousData) {
        // Recreate the layer
        const [layer] = await tx
          .insert(areaLayers)
          .values(previousData.layer)
          .returning();
        // Recreate postal codes
        if (previousData.postalCodes?.length > 0) {
          await tx.insert(areaLayerPostalCodes).values(
            previousData.postalCodes.map((code: string) => ({
              layerId: layer.id,
              postalCode: code,
            }))
          );
        }
      }
      break;

    case "add_postal_codes":
      if (entityId && change.changeData?.postalCodes) {
        // Remove the postal codes
        await tx
          .delete(areaLayerPostalCodes)
          .where(
            and(
              eq(areaLayerPostalCodes.layerId, entityId),
              inArray(areaLayerPostalCodes.postalCode, change.changeData.postalCodes)
            )
          );
      }
      break;

    case "remove_postal_codes":
      if (entityId && previousData?.postalCodes) {
        // Re-add the postal codes
        await tx.insert(areaLayerPostalCodes).values(
          previousData.postalCodes.map((code: string) => ({
            layerId: entityId,
            postalCode: code,
          }))
        );
      }
      break;

    case "update_area":
      if (previousData) {
        await tx
          .update(areas)
          .set(previousData)
          .where(eq(areas.id, change.areaId));
      }
      break;
  }
}

/**
 * Apply a redo operation based on change type
 */
async function applyRedoOperation(tx: any, change: any): Promise<void> {
  const { changeType, entityId, changeData } = change;

  switch (changeType) {
    case "create_layer":
      if (changeData) {
        // Recreate the layer
        const [layer] = await tx
          .insert(areaLayers)
          .values(changeData.layer)
          .returning();
        // Recreate postal codes
        if (changeData.postalCodes?.length > 0) {
          await tx.insert(areaLayerPostalCodes).values(
            changeData.postalCodes.map((code: string) => ({
              layerId: layer.id,
              postalCode: code,
            }))
          );
        }
      }
      break;

    case "update_layer":
      if (entityId && changeData) {
        await tx
          .update(areaLayers)
          .set(changeData)
          .where(eq(areaLayers.id, entityId));
      }
      break;

    case "delete_layer":
      if (entityId) {
        await tx
          .delete(areaLayerPostalCodes)
          .where(eq(areaLayerPostalCodes.layerId, entityId));
        await tx.delete(areaLayers).where(eq(areaLayers.id, entityId));
      }
      break;

    case "add_postal_codes":
      if (entityId && changeData?.postalCodes) {
        await tx.insert(areaLayerPostalCodes).values(
          changeData.postalCodes.map((code: string) => ({
            layerId: entityId,
            postalCode: code,
          }))
        );
      }
      break;

    case "remove_postal_codes":
      if (entityId && changeData?.postalCodes) {
        await tx
          .delete(areaLayerPostalCodes)
          .where(
            and(
              eq(areaLayerPostalCodes.layerId, entityId),
              inArray(areaLayerPostalCodes.postalCode, changeData.postalCodes)
            )
          );
      }
      break;

    case "update_area":
      if (changeData) {
        await tx
          .update(areas)
          .set(changeData)
          .where(eq(areas.id, change.areaId));
      }
      break;
  }
}

// ===============================
// CHANGE HISTORY & QUERIES
// ===============================

/**
 * Get change history for an area
 */
export async function getChangeHistoryAction(
  areaId: number,
  options?: {
    versionId?: number;
    limit?: number;
    includeUndone?: boolean;
  }
): ServerActionResponse<any[]> {
  try {
    let whereConditions = eq(areaChanges.areaId, areaId);

    if (options?.versionId) {
      whereConditions = and(
        whereConditions,
        eq(areaChanges.versionId, options.versionId)
      )!;
    }

    if (!options?.includeUndone) {
      whereConditions = and(
        whereConditions,
        eq(areaChanges.isUndone, "false")
      )!;
    }

    let query = db
      .select()
      .from(areaChanges)
      .where(whereConditions)
      .orderBy(desc(areaChanges.sequenceNumber));

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    const changes = await query;
    return { success: true, data: changes };
  } catch (error) {
    console.error("Error fetching change history:", error);
    return { success: false, error: "Failed to fetch change history" };
  }
}

/**
 * Get undo/redo stack status
 */
export async function getUndoRedoStatusAction(
  areaId: number
): ServerActionResponse<{
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}> {
  try {
    const stack = await db.query.areaUndoStacks.findFirst({
      where: eq(areaUndoStacks.areaId, areaId),
    });

    if (!stack) {
      return {
        success: true,
        data: { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 },
      };
    }

    const undoStack = (stack.undoStack as number[]) || [];
    const redoStack = (stack.redoStack as number[]) || [];

    return {
      success: true,
      data: {
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoCount: undoStack.length,
        redoCount: redoStack.length,
      },
    };
  } catch (error) {
    console.error("Error getting undo/redo status:", error);
    return { success: false, error: "Failed to get undo/redo status" };
  }
}

/**
 * Clear undo/redo stacks (useful when creating a new version)
 */
export async function clearUndoRedoStacksAction(
  areaId: number
): ServerActionResponse {
  try {
    const stack = await db.query.areaUndoStacks.findFirst({
      where: eq(areaUndoStacks.areaId, areaId),
    });

    if (stack) {
      await db
        .update(areaUndoStacks)
        .set({
          undoStack: [],
          redoStack: [],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(areaUndoStacks.id, stack.id));
    }

    return { success: true };
  } catch (error) {
    console.error("Error clearing undo/redo stacks:", error);
    return { success: false, error: "Failed to clear undo/redo stacks" };
  }
}