import { db } from "@/lib/db";
import { areas, areaLayers } from "@/lib/schema/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/areas - List all areas
export async function GET() {
  try {
    const allAreas = await db
      .select({
        id: areas.id,
        name: areas.name,
        description: areas.description,
        granularity: areas.granularity,
        isArchived: areas.isArchived,
        createdAt: areas.createdAt,
        updatedAt: areas.updatedAt,
      })
      .from(areas)
      .where(eq(areas.isArchived, "false"))
      .orderBy(desc(areas.updatedAt));

    return NextResponse.json(allAreas);
  } catch (error) {
    console.error("Error fetching areas:", error);
    return NextResponse.json(
      { error: "Failed to fetch areas" },
      { status: 500 }
    );
  }
}

// POST /api/areas - Create a new area with a default layer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, granularity = "5digit" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create area and default layer in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the area
      const [newArea] = await tx
        .insert(areas)
        .values({
          name,
          description,
          granularity,
          isArchived: "false",
        })
        .returning();

      // Create a default layer
      const [defaultLayer] = await tx
        .insert(areaLayers)
        .values({
          areaId: newArea.id,
          name: "Layer 1",
          color: "#3b82f6",
          opacity: 70,
          isVisible: "true",
          orderIndex: 0,
        })
        .returning();

      return { area: newArea, defaultLayer };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating area:", error);
    return NextResponse.json(
      { error: "Failed to create area" },
      { status: 500 }
    );
  }
}
