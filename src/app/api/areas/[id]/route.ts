import { db } from "@/lib/db";
import { areas, areaLayers, areaLayerPostalCodes } from "@/lib/schema/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/areas/[id] - Get a specific area with its layers
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const areaId = parseInt(id, 10);

    if (isNaN(areaId)) {
      return NextResponse.json({ error: "Invalid area ID" }, { status: 400 });
    }

    // Fetch area with layers and postal codes
    const area = await db.query.areas.findFirst({
      where: eq(areas.id, areaId),
      with: {
        layers: {
          with: {
            postalCodes: true,
          },
          orderBy: (layers: any, { asc }: any) => [asc(layers.orderIndex)],
        },
      },
    });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(area);
  } catch (error) {
    console.error("Error fetching area:", error);
    return NextResponse.json(
      { error: "Failed to fetch area" },
      { status: 500 }
    );
  }
}

// PATCH /api/areas/[id] - Update an area
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const areaId = parseInt(id, 10);

    if (isNaN(areaId)) {
      return NextResponse.json({ error: "Invalid area ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, granularity, isArchived } = body;

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (granularity !== undefined) updates.granularity = granularity;
    if (isArchived !== undefined) updates.isArchived = isArchived;

    const [updatedArea] = await db
      .update(areas)
      .set(updates)
      .where(eq(areas.id, areaId))
      .returning();

    if (!updatedArea) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(updatedArea);
  } catch (error) {
    console.error("Error updating area:", error);
    return NextResponse.json(
      { error: "Failed to update area" },
      { status: 500 }
    );
  }
}

// DELETE /api/areas/[id] - Delete an area (soft delete by archiving)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const areaId = parseInt(id, 10);

    if (isNaN(areaId)) {
      return NextResponse.json({ error: "Invalid area ID" }, { status: 400 });
    }

    const [archivedArea] = await db
      .update(areas)
      .set({ isArchived: "true" })
      .where(eq(areas.id, areaId))
      .returning();

    if (!archivedArea) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting area:", error);
    return NextResponse.json(
      { error: "Failed to delete area" },
      { status: 500 }
    );
  }
}
