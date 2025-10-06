import { db } from "../../lib/db";
import { areaLayers } from "../../lib/schema/schema";
import { eq } from "drizzle-orm";
import { LayerManagementClient } from "./layer-management-client";

interface LayerManagementServerProps {
  areaId: number;
  activeLayerId: number | null;
}

export async function LayerManagementServer({
  areaId,
  activeLayerId,
}: LayerManagementServerProps) {
  // Fetch layers from database on the server
  const layers = await db.query.areaLayers.findMany({
    where: eq(areaLayers.areaId, areaId),
    with: {
      postalCodes: true,
    },
    orderBy: (layers, { asc }) => [asc(layers.orderIndex)],
  });

  return (
    <LayerManagementClient
      areaId={areaId}
      initialLayers={layers}
      activeLayerId={activeLayerId}
    />
  );
}
