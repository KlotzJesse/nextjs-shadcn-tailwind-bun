import { db } from "@/lib/db";
import { areaLayers, areaLayerPostalCodes } from "@/lib/schema/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/areas/[id]/layers - Get all layers for an area
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

    const layers = await db.query.areaLayers.findMany({
      where: eq(areaLayers.areaId, areaId),
      with: {
        postalCodes: true,
      },
      orderBy: (layers, { asc }) => [asc(layers.orderIndex)],
    });

    return NextResponse.json(layers);
  } catch (error) {
    console.error("Error fetching layers:", error);
    return NextResponse.json(
      { error: "Failed to fetch layers" },
      { status: 500 }
    );
  }
}

// POST /api/areas/[id]/layers - Create a new layer
export async function POST(
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
    const {
      name,
      color = "#3b82f6",
      opacity = 70,
      isVisible = "true",
      orderIndex = 0,
      postalCodes = [],
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Create the layer
      const [newLayer] = await tx
        .insert(areaLayers)
        .values({
          areaId,
          name,
          color,
          opacity,
          isVisible,
          orderIndex,
        })
        .returning();

      // Add postal codes if provided
      if (postalCodes.length > 0) {
        await tx.insert(areaLayerPostalCodes).values(
          postalCodes.map((code: string) => ({
            layerId: newLayer.id,
            postalCode: code,
          }))
        );
      }

      return newLayer;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating layer:", error);
    return NextResponse.json(
      { error: "Failed to create layer" },
      { status: 500 }
    );
  }
}
