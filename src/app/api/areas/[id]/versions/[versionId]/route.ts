import { db } from "@/lib/db";
import { areaVersions } from "@/lib/schema/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/areas/[id]/versions/[versionId] - Get a specific version
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const areaId = parseInt(id, 10);
    const versionIdNum = parseInt(versionId, 10);

    if (isNaN(areaId) || isNaN(versionIdNum)) {
      return NextResponse.json(
        { error: "Invalid area ID or version ID" },
        { status: 400 }
      );
    }

    // Fetch the specific version
    const version = await db.query.areaVersions.findFirst({
      where: and(
        eq(areaVersions.areaId, areaId),
        eq(areaVersions.id, versionIdNum)
      ),
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error("Error fetching version:", error);
    return NextResponse.json(
      { error: "Failed to fetch version" },
      { status: 500 }
    );
  }
}
