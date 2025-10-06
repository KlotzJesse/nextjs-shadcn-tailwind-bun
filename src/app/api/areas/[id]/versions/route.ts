import { db } from "@/lib/db";
import { areaVersions, areas } from "@/lib/schema/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/areas/[id]/versions - Get version history for an area
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

    const versions = await db
      .select()
      .from(areaVersions)
      .where(eq(areaVersions.areaId, areaId))
      .orderBy(desc(areaVersions.versionNumber));

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// POST /api/areas/[id]/versions - Create a new version snapshot
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
    const { name, description, changesSummary, createdBy } = body;

    // Get current area data with layers
    const area = await db.query.areas.findFirst({
      where: eq(areas.id, areaId),
      with: {
        layers: {
          with: {
            postalCodes: true,
          },
        },
      },
    });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Get the latest version number
    const latestVersion = await db
      .select()
      .from(areaVersions)
      .where(eq(areaVersions.areaId, areaId))
      .orderBy(desc(areaVersions.versionNumber))
      .limit(1);

    const nextVersionNumber =
      latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

    // Create snapshot
    const snapshot = {
      areaName: area.name,
      granularity: area.granularity,
      layers: (area.layers as any[]).map((layer: any) => ({
        id: layer.id,
        name: layer.name,
        color: layer.color,
        opacity: layer.opacity,
        isVisible: layer.isVisible,
        orderIndex: layer.orderIndex,
        postalCodes: layer.postalCodes.map((pc: any) => pc.postalCode),
      })),
    };

    const [newVersion] = await db
      .insert(areaVersions)
      .values({
        areaId,
        versionNumber: nextVersionNumber,
        name,
        description,
        snapshot,
        changesSummary,
        createdBy,
      })
      .returning();

    return NextResponse.json(newVersion, { status: 201 });
  } catch (error) {
    console.error("Error creating version:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
