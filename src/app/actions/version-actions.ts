"use server";

import { db } from "../../lib/db";

import {
  areaVersions,
  areas,
  areaLayers,
  areaLayerPostalCodes,
  areaChanges,
} from "../../lib/schema/schema";

import { eq, and, desc, inArray, sql } from "drizzle-orm";

import { clearUndoRedoStacksAction } from "./change-tracking-actions";

type ServerActionResponse<T = void> = Promise<{
  success: boolean;

  data?: T;

  error?: string;
}>;

// ===============================

// VERSION CREATION

// ===============================

/**
 * Create a new version (snapshot) of the current area state
 */

export async function createVersionAction(
  areaId: number,

  data: {
    name?: string;

    description?: string;

    changesSummary?: string;

    createdBy?: string;

    branchName?: string;

    fromVersionId?: number; // If branching from a specific version
  },
): ServerActionResponse<{ areaId: number; versionNumber: number }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get current area with all layers and postal codes

      const area = await tx.query.areas.findFirst({
        where: eq(areas.id, areaId),

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
        throw new Error("Area not found");
      }

      // Get the next version number

      const lastVersion = await tx

        .select({ versionNumber: areaVersions.versionNumber })

        .from(areaVersions)

        .where(eq(areaVersions.areaId, areaId))

        .orderBy(desc(areaVersions.versionNumber))

        .limit(1);

      const nextVersionNumber =
        lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;

      // Get change count since last version or from start

      const changeCount = await tx

        .select({ count: sql<number>`count(*)` })

        .from(areaChanges)

        .where(
          and(
            eq(areaChanges.areaId, areaId),

            data.fromVersionId
              ? eq(areaChanges.versionAreaId, data.fromVersionId)
              : eq(areaChanges.versionAreaId, sql`NULL`),
          ),
        );

      // Create snapshot

      const snapshot = {
        areaName: area.name,

        description: area.description,

        granularity: area.granularity,

        layers: area.layers.map((layer) => ({
          id: layer.id,

          name: layer.name,

          color: layer.color,

          opacity: layer.opacity,

          isVisible: layer.isVisible,

          orderIndex: layer.orderIndex,

          postalCodes: layer.postalCodes?.map((pc) => pc.postalCode) || [],
        })),
      };

      // Deactivate all previous versions for this area

      await tx

        .update(areaVersions)

        .set({ isActive: "false" })

        .where(eq(areaVersions.areaId, areaId));

      // Create the version

      const [version] = await tx

        .insert(areaVersions)

        .values({
          areaId,

          versionNumber: nextVersionNumber,

          name: data.name,

          description: data.description,

          snapshot,

          changesSummary: data.changesSummary,

          parentVersionAreaId: null, // Will be set when branching

          parentVersionNumber: null, // Will be set when branching

          branchName: data.branchName,

          isActive: "true",

          changeCount: changeCount[0]?.count || 0,

          createdBy: data.createdBy,
        })

        .returning();

      // Update area's current version

      await tx

        .update(areas)

        .set({ currentVersionNumber: version.versionNumber })

        .where(eq(areas.id, areaId));

      // Update all uncommitted changes to be associated with this version

      await tx

        .update(areaChanges)

        .set({
          versionAreaId: version.areaId,

          versionNumber: version.versionNumber,
        })

        .where(
          and(
            eq(areaChanges.areaId, areaId),

            eq(areaChanges.versionAreaId, sql`NULL`),
          ),
        );

      return { areaId: version.areaId, versionNumber: version.versionNumber };
    });

    // Clear undo/redo stacks after creating version

    await clearUndoRedoStacksAction(areaId);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating version:", error);

    return {
      success: false,

      error:
        error instanceof Error ? error.message : "Failed to create version",
    };
  }
}

/**
 * Auto-save current state as a version
 */

export async function autoSaveVersionAction(
  areaId: number,

  createdBy?: string,
): ServerActionResponse<{ areaId: number; versionNumber: number }> {
  try {
    // Check if there are any uncommitted changes

    const uncommittedChanges = await db

      .select({ count: sql<number>`count(*)` })

      .from(areaChanges)

      .where(
        and(
          eq(areaChanges.areaId, areaId),

          eq(areaChanges.versionAreaId, sql`NULL`),
        ),
      );

    if (uncommittedChanges[0]?.count === 0) {
      return { success: false, error: "No changes to save" };
    }

    const result = await createVersionAction(areaId, {
      name: `Auto-save ${new Date().toLocaleString()}`,

      changesSummary: `Auto-saved with ${uncommittedChanges[0].count} changes`,

      createdBy,
    });

    return result;
  } catch (error) {
    console.error("Error auto-saving version:", error);

    return { success: false, error: "Failed to auto-save version" };
  }
}

// ===============================

// VERSION NAVIGATION

// ===============================

/**
 * Get all versions for an area
 */

export async function getVersionsAction(
  areaId: number,
): ServerActionResponse<unknown[]> {
  try {
    const versions = await db.query.areaVersions.findMany({
      where: eq(areaVersions.areaId, areaId),

      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
    });

    return { success: true, data: versions };
  } catch (error) {
    console.error("Error fetching versions:", error);

    return { success: false, error: "Failed to fetch versions" };
  }
}

/**
 * Get a specific version
 */

export async function getVersionAction(
  areaId: number,

  versionNumber: number,
): ServerActionResponse<unknown> {
  try {
    const version = await db.query.areaVersions.findFirst({
      where: and(
        eq(areaVersions.areaId, areaId),

        eq(areaVersions.versionNumber, versionNumber),
      ),
    });

    if (!version) {
      return { success: false, error: "Version not found" };
    }

    return { success: true, data: version };
  } catch (error) {
    console.error("Error fetching version:", error);

    return { success: false, error: "Failed to fetch version" };
  }
}

// ===============================

// VERSION RESTORATION & BRANCHING

// ===============================

/**
 * Restore a version as the current working state (creates a new branch)
 */

export async function restoreVersionAction(
  areaId: number,

  versionNumber: number,

  options?: {
    createBranch?: boolean;

    branchName?: string;

    createdBy?: string;
  },
): ServerActionResponse<{ newVersionNumber?: number }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the version to restore

      const version = await tx.query.areaVersions.findFirst({
        where: and(
          eq(areaVersions.areaId, areaId),

          eq(areaVersions.versionNumber, versionNumber),
        ),
      });

      if (!version) {
        throw new Error("Version not found");
      }

      const snapshot = version.snapshot as unknown;

      // Delete all current layers

      const currentLayers = await tx

        .select({ id: areaLayers.id })

        .from(areaLayers)

        .where(eq(areaLayers.areaId, areaId));

      if (currentLayers.length > 0) {
        const layerIds = currentLayers.map((l) => l.id);

        // Use inArray instead of ANY for proper Drizzle syntax

        await tx

          .delete(areaLayerPostalCodes)

          .where(inArray(areaLayerPostalCodes.layerId, layerIds));

        await tx.delete(areaLayers).where(eq(areaLayers.areaId, areaId));
      }

      // Restore layers from snapshot

      for (const layerData of snapshot.layers) {
        const [layer] = await tx

          .insert(areaLayers)

          .values({
            areaId,

            name: layerData.name,

            color: layerData.color,

            opacity: layerData.opacity,

            isVisible: layerData.isVisible,

            orderIndex: layerData.orderIndex,
          })

          .returning();

        // Restore postal codes

        if (layerData.postalCodes?.length > 0) {
          await tx.insert(areaLayerPostalCodes).values(
            layerData.postalCodes.map((code: string) => ({
              layerId: layer.id,

              postalCode: code,
            })),
          );
        }
      }

      // Update area properties if they changed

      await tx

        .update(areas)

        .set({
          name: snapshot.areaName,

          description: snapshot.description,

          granularity: snapshot.granularity,
        })

        .where(eq(areas.id, areaId));

      // Create a new version if branching

      let newVersionId: number | undefined;

      if (options?.createBranch) {
        // Get the next version number for this area

        const lastVersion = await tx

          .select({ versionNumber: areaVersions.versionNumber })

          .from(areaVersions)

          .where(eq(areaVersions.areaId, areaId))

          .orderBy(desc(areaVersions.versionNumber))

          .limit(1);

        const nextVersionNumber =
          lastVersion.length > 0 ? lastVersion[0].versionNumber + 1 : 1;

        const [newVersion] = await tx

          .insert(areaVersions)

          .values({
            areaId,

            versionNumber: nextVersionNumber,

            name: options.branchName || `Branch from v${version.versionNumber}`,

            description: `Restored from version ${version.versionNumber}`,

            snapshot: version.snapshot,

            parentVersionAreaId: version.areaId,

            parentVersionNumber: version.versionNumber,

            branchName: options.branchName,

            isActive: "true",

            changeCount: 0,

            createdBy: options.createdBy,
          })

          .returning();

        newVersionId = newVersion.versionNumber;

        // Update area's current version

        await tx

          .update(areas)

          .set({ currentVersionNumber: newVersion.versionNumber })

          .where(eq(areas.id, areaId));
      }

      return { newVersionNumber: newVersionId };
    });

    // Clear undo/redo stacks after restoration

    await clearUndoRedoStacksAction(areaId);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error restoring version:", error);

    return {
      success: false,

      error:
        error instanceof Error ? error.message : "Failed to restore version",
    };
  }
}

/**
 * Delete a version
 */

export async function deleteVersionAction(
  areaId: number,

  versionNumber: number,
): ServerActionResponse {
  try {
    await db.transaction(async (tx) => {
      // Check if this is the active version

      const version = await tx.query.areaVersions.findFirst({
        where: and(
          eq(areaVersions.areaId, areaId),

          eq(areaVersions.versionNumber, versionNumber),
        ),
      });

      if (!version) {
        throw new Error("Version not found");
      }

      if (version.isActive === "true") {
        throw new Error("Cannot delete active version");
      }

      // Delete associated changes

      await tx

        .delete(areaChanges)

        .where(
          and(
            eq(areaChanges.versionAreaId, version.areaId),

            eq(areaChanges.versionNumber, version.versionNumber),
          ),
        );

      // Delete the version

      await tx

        .delete(areaVersions)

        .where(
          and(
            eq(areaVersions.areaId, areaId),

            eq(areaVersions.versionNumber, versionNumber),
          ),
        );
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting version:", error);

    return {
      success: false,

      error:
        error instanceof Error ? error.message : "Failed to delete version",
    };
  }
}

/**
 * Compare two versions and get differences
 */

export async function compareVersionsAction(
  areaId1: number,

  versionNumber1: number,

  areaId2: number,

  versionNumber2: number,
): ServerActionResponse<{
  layersAdded: unknown[];

  layersRemoved: unknown[];

  layersModified: unknown[];

  postalCodesAdded: unknown[];

  postalCodesRemoved: unknown[];
}> {
  try {
    const [version1, version2] = await Promise.all([
      db.query.areaVersions.findFirst({
        where: and(
          eq(areaVersions.areaId, areaId1),

          eq(areaVersions.versionNumber, versionNumber1),
        ),
      }),

      db.query.areaVersions.findFirst({
        where: and(
          eq(areaVersions.areaId, areaId2),

          eq(areaVersions.versionNumber, versionNumber2),
        ),
      }),
    ]);

    if (!version1 || !version2) {
      return { success: false, error: "One or both versions not found" };
    }

    const snapshot1 = version1.snapshot as unknown;

    const snapshot2 = version2.snapshot as unknown;

    // Compare layers

    const layers1Map = new Map((snapshot1 as { layers: unknown[] }).layers.map((l: unknown) => [(l as { name: string }).name, l]));

    const layers2Map = new Map((snapshot2 as { layers: unknown[] }).layers.map((l: unknown) => [(l as { name: string }).name, l]));

    const layersAdded = (snapshot2 as { layers: unknown[] }).layers.filter(
      (l: unknown) => !layers1Map.has((l as { name: string }).name),
    );

    const layersRemoved = (snapshot1 as { layers: unknown[] }).layers.filter(
      (l: unknown) => !layers2Map.has((l as { name: string }).name),
    );

    const layersModified = (snapshot2 as { layers: unknown[] }).layers.filter((l2: unknown) => {
      const l1 = layers1Map.get((l2 as { name: string }).name);

      if (!l1) return false;

      return (
        (l1 as { color: string }).color !== (l2 as { color: string }).color ||
        (l1 as { opacity: number }).opacity !== (l2 as { opacity: number }).opacity ||
        JSON.stringify((l1 as { postalCodes: string[] }).postalCodes.sort()) !==
          JSON.stringify((l2 as { postalCodes: string[] }).postalCodes.sort())
      );
    });

    // Compare postal codes

    const allCodes1 = new Set(
      (snapshot1 as { layers: unknown[] }).layers.flatMap((l: unknown) => (l as { postalCodes: string[] }).postalCodes),
    );

    const allCodes2 = new Set(
      (snapshot2 as { layers: unknown[] }).layers.flatMap((l: unknown) => (l as { postalCodes: string[] }).postalCodes),
    );

    const postalCodesAdded = Array.from(allCodes2).filter(
      (c) => !allCodes1.has(c),
    );

    const postalCodesRemoved = Array.from(allCodes1).filter(
      (c) => !allCodes2.has(c),
    );

    return {
      success: true,

      data: {
        layersAdded,

        layersRemoved,

        layersModified,

        postalCodesAdded,

        postalCodesRemoved,
      },
    };
  } catch (error) {
    console.error("Error comparing versions:", error);

    return { success: false, error: "Failed to compare versions" };
  }
}
