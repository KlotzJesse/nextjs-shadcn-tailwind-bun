import { Suspense } from "react";
import {
  getAreasAction,
  getAreaByIdAction,
  getLayersAction,
} from "@/app/actions/area-actions";
import { PostalCodesViewClientWithLayers } from "./postal-codes-view-client-layers";
import PostalCodesViewClient from "./postal-codes-view-client";
import { areas, areaLayers } from "@/lib/schema/schema";
import type { InferSelectModel } from "drizzle-orm";
import type {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

type Area = InferSelectModel<typeof areas>;
type Layer = InferSelectModel<typeof areaLayers> & {
  postalCodes?: { postalCode: string }[];
};

interface PostalCodesViewServerProps {
  initialData: FeatureCollection<MultiPolygon | Polygon, GeoJsonProperties>;
  statesData: FeatureCollection<MultiPolygon | Polygon, GeoJsonProperties>;
  defaultGranularity: string;
  areaId?: number | null;
  activeLayerId?: number | null;
  versionId?: number | null;
}

// Helper function to get the latest version ID for an area
async function getLatestVersionId(areaId: number): Promise<number | null> {
  try {
    const versionsResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/api/areas/${areaId}/versions`,
      { cache: "no-store" }
    );

    if (versionsResponse.ok) {
      const versions = await versionsResponse.json();
      if (versions.length > 0) {
        // Versions are ordered by versionNumber DESC, so first is latest
        return versions[0].id;
      }
    }
  } catch (error) {
    console.error("Failed to fetch latest version:", error);
  }
  return null;
}

// Helper function to load version data
async function loadVersionData(areaId: number, versionId: number) {
  try {
    const versionResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/api/areas/${areaId}/versions/${versionId}`,
      { cache: "no-store" }
    );

    if (versionResponse.ok) {
      const version = await versionResponse.json();

      // Convert version snapshot to expected format
      const area = {
        id: areaId,
        name: version.snapshot.areaName,
        description: null,
        granularity: version.snapshot.granularity,
        isArchived: "false",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        layers: version.snapshot.layers.map((layer: any, index: number) => ({
          id: layer.id || 1000 + index, // Use unique IDs for version layers
          areaId: areaId,
          name: layer.name,
          color: layer.color,
          opacity: layer.opacity,
          isVisible:
            typeof layer.isVisible === "string"
              ? layer.isVisible
              : layer.isVisible
              ? "true"
              : "false",
          orderIndex: layer.orderIndex,
          postalCodes: layer.postalCodes.map((code: string) => ({
            postalCode: code,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };

      return { area, layers: area.layers };
    } else {
      console.error(
        "Failed to fetch version data:",
        versionResponse.statusText
      );
    }
  } catch (error) {
    console.error("Failed to load version data:", error);
  }
  return null;
}

export async function PostalCodesViewServer({
  initialData,
  statesData,
  defaultGranularity,
  areaId,
  activeLayerId,
  versionId,
}: PostalCodesViewServerProps) {
  // If we have an areaId, fetch the area and layers data on the server
  if (areaId && areaId > 0) {
    // Determine which version to load
    let targetVersionId = versionId;

    // If no specific version is requested, try to get the latest version
    if (!targetVersionId) {
      targetVersionId = await getLatestVersionId(areaId);
    }

    // If we have a target version (either specified or latest), load version data
    if (targetVersionId && targetVersionId > 0) {
      const versionData = await loadVersionData(areaId, targetVersionId);

      if (versionData) {
        // Also fetch all areas for the sidebar (current data)
        const areasResult = await getAreasAction();
        const allAreas = areasResult.success ? areasResult.data || [] : [];

        // Add the version area to the areas list if it's not already there
        const areas = allAreas.some((a) => a.id === areaId)
          ? allAreas
          : [...allAreas, versionData.area];

        console.log("Loading version data:", {
          versionId: targetVersionId,
          areaId,
          areaName: versionData.area.name,
          layersCount: versionData.layers.length,
          areasCount: areas.length,
          layersDetails: versionData.layers.map((l: any) => ({
            id: l.id,
            name: l.name,
            isVisible: l.isVisible,
            postalCodesCount: l.postalCodes?.length,
          })),
        });

        return (
          <PostalCodesViewClientWithLayers
            initialData={initialData}
            statesData={statesData}
            defaultGranularity={defaultGranularity}
            areaId={areaId}
            activeLayerId={activeLayerId || null}
            initialAreas={areas}
            initialArea={versionData.area}
            initialLayers={versionData.layers}
            isViewingVersion={true}
            versionId={targetVersionId}
          />
        );
      }
    }

    // Fallback to current data (if no versions exist or version loading failed)
    const [areasResult, areaResult, layersResult] = await Promise.all([
      getAreasAction(),
      getAreaByIdAction(areaId),
      getLayersAction(areaId),
    ]);

    const areas = areasResult.success ? areasResult.data : [];
    const area = areaResult.success ? areaResult.data : null;
    const layers = layersResult.success ? layersResult.data : [];

    console.log("Loading current data (fallback):", {
      areaId,
      areaName: area?.name,
      layersCount: layers?.length,
      areasCount: areas?.length,
      hasVersions: "unknown",
      layersDetails: layers?.map((l: any) => ({
        id: l.id,
        name: l.name,
        isVisible: l.isVisible,
        postalCodesCount: l.postalCodes?.length,
      })),
    });

    return (
      <PostalCodesViewClientWithLayers
        initialData={initialData}
        statesData={statesData}
        defaultGranularity={defaultGranularity}
        areaId={areaId}
        activeLayerId={activeLayerId || null}
        initialAreas={areas || []}
        initialArea={area}
        initialLayers={layers || []}
      />
    );
  }

  // If no areaId, use the basic client component
  return (
    <PostalCodesViewClient
      initialData={initialData}
      statesData={statesData}
      defaultGranularity={defaultGranularity}
    />
  );
}
