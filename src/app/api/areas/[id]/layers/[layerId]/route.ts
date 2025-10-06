import { db } from "@/lib/db";
import { areaLayers, areaLayerPostalCodes } from "@/lib/schema/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/areas/[id]/layers/[layerId] - Update a layer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; layerId: string }> }
) {
  try {
    const { layerId } = await params;
    const layerIdNum = parseInt(layerId, 10);

    if (isNaN(layerIdNum)) {
      return NextResponse.json({ error: "Invalid layer ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, color, opacity, isVisible, orderIndex, postalCodes } = body;

    await db.transaction(async (tx) => {
      // Update layer properties
      const updates: Record<string, string | number> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (opacity !== undefined) updates.opacity = opacity;
      if (isVisible !== undefined) updates.isVisible = isVisible;
      if (orderIndex !== undefined) updates.orderIndex = orderIndex;

      if (Object.keys(updates).length > 0) {
        await tx
          .update(areaLayers)
          .set(updates)
          .where(eq(areaLayers.id, layerIdNum));
      }

      // Update postal codes if provided
      if (postalCodes !== undefined) {
        // Delete existing postal codes
        await tx
          .delete(areaLayerPostalCodes)
          .where(eq(areaLayerPostalCodes.layerId, layerIdNum));

        // Insert new postal codes
        if (postalCodes.length > 0) {
          await tx.insert(areaLayerPostalCodes).values(
            postalCodes.map((code: string) => ({
              layerId: layerIdNum,
              postalCode: code,
            }))
          );
        }
      }
    });

    // Fetch and return updated layer
    const updatedLayer = await db.query.areaLayers.findFirst({
      where: eq(areaLayers.id, layerIdNum),
      with: {
        postalCodes: true,
      },
    });

    return NextResponse.json(updatedLayer);
  } catch (error) {
    console.error("Error updating layer:", error);
    return NextResponse.json(
      { error: "Failed to update layer" },
      { status: 500 }
    );
  }
}

// DELETE /api/areas/[id]/layers/[layerId] - Delete a layer
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; layerId: string }> }
) {
  try {
    const { layerId } = await params;
    const layerIdNum = parseInt(layerId, 10);

    if (isNaN(layerIdNum)) {
      return NextResponse.json({ error: "Invalid layer ID" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // Delete postal codes first (foreign key constraint)
      await tx
        .delete(areaLayerPostalCodes)
        .where(eq(areaLayerPostalCodes.layerId, layerIdNum));

      // Delete the layer
      await tx.delete(areaLayers).where(eq(areaLayers.id, layerIdNum));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting layer:", error);
    return NextResponse.json(
      { error: "Failed to delete layer" },
      { status: 500 }
    );
  }
}
