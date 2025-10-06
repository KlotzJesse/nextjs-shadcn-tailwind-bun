import type {
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";
import type {
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { useEffect, useLayoutEffect, useMemo } from "react";
import type { Layer } from "@/lib/hooks/use-areas";

interface UseMapLayersProps {
  map: MapLibreMap | null;
  isMapLoaded: boolean;
  layerId: string;
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
  hoveredRegionId: string | null;
  getSelectedFeatureCollection: () => FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  >;
  getLabelPoints: (
    data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
  ) => FeatureCollection<Geometry, GeoJsonProperties>;
  layers?: Layer[];
  activeLayerId?: number | null;
}

/**
 * Enterprise-grade hook for initializing and managing all map layers and sources.
 * Handles main, selected, hover, label, and state layers, and exposes a stable API for business logic.
 */
export function useMapLayers({
  map,
  isMapLoaded,
  layerId,
  data,
  statesData,
  hoveredRegionId,
  getSelectedFeatureCollection,
  getLabelPoints,
  layers,
  activeLayerId,
}: UseMapLayersProps) {
  // Memoize layersLoaded calculation to prevent unnecessary rerenders
  const layersLoaded = useMemo(() => {
    return !!(map && isMapLoaded && data);
  }, [map, isMapLoaded, data]);

  // Memoize all IDs for stable references
  const ids = useMemo(
    () => ({
      sourceId: `${layerId}-source`,
      hoverSourceId: `${layerId}-hover-source`,
      hoverLayerId: `${layerId}-hover-layer`,
      selectedSourceId: `${layerId}-selected-source`,
      selectedLayerId: `${layerId}-selected-layer`,
      labelSourceId: `${layerId}-label-points`,
      labelLayerId: `${layerId}-label`,
      stateSourceId: "state-boundaries-source",
      stateLayerId: "state-boundaries-layer",
      stateLabelSourceId: "state-boundaries-label-points",
      stateLabelLayerId: "state-boundaries-label",
    }),
    [layerId]
  );

  // Helper to add a layer with beforeId if it exists

  // Use useLayoutEffect for layer initialization to prevent visual flicker
  // This ensures all layers are created synchronously before paint
  useLayoutEffect(() => {
    if (!map || !isMapLoaded || !data) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[useMapLayers] Initializing layers...");
    }

    // Create stable references for functions to avoid dependency issues
    const selectedFeatureCollection = (() => {
      return getSelectedFeatureCollection();
    })();

    const labelPoints = (() => {
      return getLabelPoints(data);
    })();

    const statesLabelPoints = statesData
      ? (() => {
          return getLabelPoints(statesData);
        })()
      : null;

    // --- Robust source creation ---
    // Always create all sources first
    // 1. Main data source
    if (!map.getSource(ids.sourceId)) {
      map.addSource(ids.sourceId, { type: "geojson", data });
    } else {
      const src = map.getSource(ids.sourceId) as GeoJSONSource | undefined;
      if (src && typeof src.setData === "function") src.setData(data);
    }
    // 2. Selected source
    if (!map.getSource(ids.selectedSourceId)) {
      map.addSource(ids.selectedSourceId, {
        type: "geojson",
        data: selectedFeatureCollection,
      });
    }
    // 3. Hover source
    if (!map.getSource(ids.hoverSourceId)) {
      map.addSource(ids.hoverSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    // 4. Label points source
    if (!map.getSource(ids.labelSourceId)) {
      map.addSource(ids.labelSourceId, { type: "geojson", data: labelPoints });
    } else {
      const src = map.getSource(ids.labelSourceId) as GeoJSONSource | undefined;
      if (src && typeof src.setData === "function") src.setData(labelPoints);
    }
    // 5. State boundaries sources
    if (statesData) {
      if (!map.getSource(ids.stateSourceId)) {
        map.addSource(ids.stateSourceId, { type: "geojson", data: statesData });
      } else {
        const src = map.getSource(ids.stateSourceId) as
          | GeoJSONSource
          | undefined;
        if (src && typeof src.setData === "function") src.setData(statesData);
      }
      if (!map.getSource(ids.stateLabelSourceId)) {
        map.addSource(ids.stateLabelSourceId, {
          type: "geojson",
          data: statesLabelPoints!,
        });
      } else {
        const src = map.getSource(ids.stateLabelSourceId) as
          | GeoJSONSource
          | undefined;
        if (src && typeof src.setData === "function")
          src.setData(statesLabelPoints!);
      }
    }

    // --- Robust layer creation ---
    // Helper to add a layer with beforeId if it exists
    function safeAddLayer(layer: LayerSpecification, beforeId?: string) {
      if (!map) return;
      try {
        if (beforeId && map.getLayer(beforeId)) {
          map.addLayer(layer, beforeId);
        } else {
          map.addLayer(layer);
        }
      } catch {
        // Layer may already exist
      }
    }

    // 1. Postal code fill (bottom)
    if (!map.getLayer(`${layerId}-layer`)) {
      safeAddLayer({
        id: `${layerId}-layer`,
        type: "fill",
        source: ids.sourceId,
        paint: {
          "fill-color": "#627D98",
          "fill-opacity": 0.1,
        },
      });
    }
    // 2. Postal code border (above fill)
    if (!map.getLayer(`${layerId}-border`)) {
      map.addLayer({
        id: `${layerId}-border`,
        type: "line",
        source: ids.sourceId,
        paint: {
          "line-color": "#2563EB",
          "line-width": 1,
          "line-opacity": 0.05,
          "line-dasharray": [6, 3],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
          visibility: "visible",
        },
      } as LayerSpecification);

      if (process.env.NODE_ENV === "development") {
        console.log("[useMapLayers] Added border layer:", `${layerId}-border`);
        console.log(
          "[useMapLayers] Border layer paint properties:",
          map.getPaintProperty(`${layerId}-border`, "line-dasharray")
        );
      }
    }
    // 3. Selected postal code fill (above postal code border)
    // This shows a preview of what will be added to the active layer
    if (!map.getLayer(ids.selectedLayerId)) {
      // Get active layer color or default to blue
      const activeLayer = layers?.find((l) => l.id === activeLayerId);
      const fillColor = activeLayer?.color || "#2563EB";
      const fillOpacity = 0.3; // Lower opacity to show this is a preview/temporary

      safeAddLayer(
        {
          id: ids.selectedLayerId,
          type: "fill",
          source: ids.selectedSourceId,
          paint: {
            "fill-color": fillColor,
            "fill-opacity": fillOpacity,
            "fill-outline-color": fillColor,
          },
        },
        `${layerId}-border`
      );
    }
    // 4. Hover line (above selected postal codes)
    if (!map.getLayer(ids.hoverLayerId)) {
      safeAddLayer(
        {
          id: ids.hoverLayerId,
          type: "line",
          source: ids.hoverSourceId,
          paint: {
            "line-color": "#2563EB",
            "line-width": 3,
          },
          layout: { visibility: "none" },
        },
        ids.selectedLayerId
      );
    }
    // 5a. State boundaries fill (subtle background color for each state)
    if (
      statesData &&
      map.getSource(ids.stateSourceId) &&
      !map.getLayer("state-boundaries-fill")
    ) {
      safeAddLayer(
        {
          id: "state-boundaries-fill",
          type: "fill",
          source: ids.stateSourceId,
          paint: {
            "fill-color": [
              "match",
              ["get", "name"],
              "Baden-Württemberg",
              "#e57373",
              "Bayern",
              "#64b5f6",
              "Berlin",
              "#81c784",
              "Brandenburg",
              "#ffd54f",
              "Bremen",
              "#ba68c8",
              "Hamburg",
              "#4dd0e1",
              "Hessen",
              "#ffb74d",
              "Mecklenburg-Vorpommern",
              "#a1887f",
              "Niedersachsen",
              "#90a4ae",
              "Nordrhein-Westfalen",
              "#f06292",
              "Rheinland-Pfalz",
              "#9575cd",
              "Saarland",
              "#4caf50",
              "Sachsen",
              "#fbc02d",
              "Sachsen-Anhalt",
              "#388e3c",
              "Schleswig-Holstein",
              "#0288d1",
              "Thüringen",
              "#d84315",
              "#222", // default
            ],
            "fill-opacity": 0.1,
          },
        },
        ids.hoverLayerId
      );
    }
    // 5b. State boundaries line (above all postal code layers - highest priority)
    if (
      statesData &&
      map.getSource(ids.stateSourceId) &&
      !map.getLayer(ids.stateLayerId)
    ) {
      safeAddLayer(
        {
          id: ids.stateLayerId,
          type: "line",
          source: ids.stateSourceId,
          paint: {
            "line-color": [
              "match",
              ["get", "name"],
              "Baden-Württemberg",
              "#e57373",
              "Bayern",
              "#64b5f6",
              "Berlin",
              "#81c784",
              "Brandenburg",
              "#ffd54f",
              "Bremen",
              "#ba68c8",
              "Hamburg",
              "#4dd0e1",
              "Hessen",
              "#ffb74d",
              "Mecklenburg-Vorpommern",
              "#a1887f",
              "Niedersachsen",
              "#90a4ae",
              "Nordrhein-Westfalen",
              "#f06292",
              "Rheinland-Pfalz",
              "#9575cd",
              "Saarland",
              "#4caf50",
              "Sachsen",
              "#fbc02d",
              "Sachsen-Anhalt",
              "#388e3c",
              "Schleswig-Holstein",
              "#0288d1",
              "Thüringen",
              "#d84315",
              "#222", // default
            ],
            "line-width": 2,
            "line-opacity": 1,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        },
        "state-boundaries-fill"
      );
    }
    // 6. State label (above state boundaries)
    if (statesData && !map.getLayer("state-boundaries-label")) {
      safeAddLayer(
        {
          id: "state-boundaries-label",
          type: "symbol",
          source: "state-boundaries-label-points",
          layout: {
            "text-field": ["coalesce", ["get", "name"], ["get", "code"], ""],
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 9,
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#222",
            "text-halo-color": "#fff",
            "text-halo-width": 2.5,
          },
        },
        statesData ? ids.stateLayerId : ids.hoverLayerId
      );
    }
    // 7. Postal code label (above all layers)
    if (!map.getLayer(ids.labelLayerId)) {
      safeAddLayer(
        {
          id: ids.labelLayerId,
          type: "symbol",
          source: ids.labelSourceId,
          layout: {
            "text-field": [
              "coalesce",
              ["get", "PLZ"],
              ["get", "plz"],
              ["get", "code"],
              "",
            ],
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 9,
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#222",
            "text-halo-color": "#fff",
            "text-halo-width": 2,
          },
        },
        statesData
          ? "state-boundaries-label"
          : statesData
          ? ids.stateLayerId
          : ids.hoverLayerId
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[useMapLayers] Layers initialized successfully - optimized!"
      );
    }
  }, [
    map,
    isMapLoaded,
    data,
    statesData,
    ids,
    layerId,
    getSelectedFeatureCollection,
    getLabelPoints,
  ]);

  // Update selected features source when layers change
  // Note: Selections are now managed per-layer in the database
  useEffect(() => {
    if (!map || !layersLoaded) return;
    const src = map.getSource(ids.selectedSourceId) as
      | GeoJSONSource
      | undefined;
    if (src && typeof src.setData === "function") {
      src.setData(getSelectedFeatureCollection());
    }
  }, [getSelectedFeatureCollection, map, layersLoaded, ids.selectedSourceId]);

  // Use useLayoutEffect for hover source updates to prevent visual flicker
  // This ensures hover state changes are applied synchronously
  useLayoutEffect(() => {
    if (!map || !layersLoaded) return;
    const src = map.getSource(ids.hoverSourceId) as GeoJSONSource | undefined;
    if (src && typeof src.setData === "function") {
      if (hoveredRegionId) {
        // Find the hovered feature in data
        const feature = data.features.find(
          (f) => f.properties?.code === hoveredRegionId
        );
        if (feature) {
          src.setData({ type: "FeatureCollection", features: [feature] });
          map.setLayoutProperty(ids.hoverLayerId, "visibility", "visible");
        }
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
        map.setLayoutProperty(ids.hoverLayerId, "visibility", "none");
      }
    }
  }, [
    hoveredRegionId,
    data,
    map,
    layersLoaded,
    ids.hoverSourceId,
    ids.hoverLayerId,
  ]);

  // Cleanup on unmount or dependency change
  useEffect(() => {
    return () => {
      if (!map) return;

      // First, remove all layers (order matters: remove layers before sources)
      // Order: top to bottom (reverse of creation order)
      const layerIds = [
        ids.labelLayerId,
        "state-boundaries-label",
        ids.stateLayerId,
        "state-boundaries-fill",
        ids.hoverLayerId,
        ids.selectedLayerId,
        `${layerId}-border`,
        `${layerId}-layer`,
      ];

      layerIds.forEach((id) => {
        try {
          if (map.getLayer(id)) {
            map.removeLayer(id);
          }
        } catch (error) {
          // Layer might not exist or already removed
          if (process.env.NODE_ENV === "development") {
            console.warn(`Failed to remove layer ${id}:`, error);
          }
        }
      });

      // Then remove all sources (after all layers are removed)
      const sourceIds = [
        ids.sourceId,
        ids.selectedSourceId,
        ids.hoverSourceId,
        ids.labelSourceId,
        ids.stateSourceId,
        ids.stateLabelSourceId,
      ];

      sourceIds.forEach((id) => {
        try {
          if (map.getSource(id)) {
            map.removeSource(id);
          }
        } catch (error) {
          // Source might not exist or already removed
          if (process.env.NODE_ENV === "development") {
            console.warn(`Failed to remove source ${id}:`, error);
          }
        }
      });
    };
  }, [map, layerId, ids]);

  // Effect for rendering area layers with custom colors
  useEffect(() => {
    if (!map || !isMapLoaded || !layers || layers.length === 0) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[useMapLayers] Rendering area layers:", layers.length);
      layers.forEach((layer) => {
        console.log(`[useMapLayers] Layer ${layer.id} (${layer.name}):`, {
          postalCodesCount: layer.postalCodes?.length || 0,
          color: layer.color,
          opacity: layer.opacity,
          isVisible: layer.isVisible,
          isActive: activeLayerId === layer.id,
        });
      });
    }

    // Create a feature collection for each layer with its postal codes
    layers.forEach((layer) => {
      const layerSourceId = `area-layer-${layer.id}-source`;
      const layerFillId = `area-layer-${layer.id}-fill`;
      const layerBorderId = `area-layer-${layer.id}-border`;

      // Get postal codes for this layer
      const postalCodes = layer.postalCodes?.map((pc) => pc.postalCode) || [];

      // Filter features from the main data that match this layer's postal codes
      const layerFeatures = data.features.filter((feature) => {
        const code =
          feature.properties?.code ||
          feature.properties?.plz ||
          feature.properties?.postalCode;
        return code && postalCodes.includes(code.toString());
      });

      if (process.env.NODE_ENV === "development" && postalCodes.length > 0) {
        console.log(
          `[useMapLayers] Layer ${layer.id} matched ${layerFeatures.length}/${postalCodes.length} features`
        );
        if (layerFeatures.length === 0 && postalCodes.length > 0) {
          console.warn(
            `[useMapLayers] No features found for layer ${layer.id}. First postal code:`,
            postalCodes[0]
          );
          console.warn(
            `[useMapLayers] First data feature code:`,
            data.features[0]?.properties?.code
          );
        }
      }

      const layerFeatureCollection: FeatureCollection<
        Polygon | MultiPolygon,
        GeoJsonProperties
      > = {
        type: "FeatureCollection",
        features: layerFeatures,
      };

      // Add or update source
      if (!map.getSource(layerSourceId)) {
        map.addSource(layerSourceId, {
          type: "geojson",
          data: layerFeatureCollection,
        });
      } else {
        const src = map.getSource(layerSourceId) as GeoJSONSource | undefined;
        if (src && typeof src.setData === "function") {
          src.setData(layerFeatureCollection);
        }
      }

      // Parse hex color to RGB for opacity
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 59, g: 130, b: 246 }; // Default blue
      };

      const rgb = hexToRgb(layer.color);
      const opacity = layer.opacity / 100;
      const isVisible = layer.isVisible === "true";
      const isActive = activeLayerId === layer.id;

      // Add fill layer
      if (!map.getLayer(layerFillId)) {
        map.addLayer(
          {
            id: layerFillId,
            type: "fill",
            source: layerSourceId,
            paint: {
              "fill-color": layer.color,
              "fill-opacity": isVisible ? opacity * 0.6 : 0,
            },
            layout: {
              visibility: isVisible ? "visible" : "none",
            },
          } as LayerSpecification,
          ids.hoverLayerId // Place area layers below hover layer
        );
      } else {
        // Update existing layer
        map.setPaintProperty(layerFillId, "fill-color", layer.color);
        map.setPaintProperty(
          layerFillId,
          "fill-opacity",
          isVisible ? opacity * 0.6 : 0
        );
        map.setLayoutProperty(
          layerFillId,
          "visibility",
          isVisible ? "visible" : "none"
        );
      }

      // Add border layer with highlight for active layer
      if (!map.getLayer(layerBorderId)) {
        map.addLayer(
          {
            id: layerBorderId,
            type: "line",
            source: layerSourceId,
            paint: {
              "line-color": layer.color,
              "line-width": isActive ? 2.5 : 1.5,
              "line-opacity": isVisible ? (isActive ? 0.9 : 0.7) : 0,
            },
            layout: {
              "line-cap": "round",
              "line-join": "round",
              visibility: isVisible ? "visible" : "none",
            },
          } as LayerSpecification,
          ids.hoverLayerId // Place area layers below hover layer
        );
      } else {
        // Update existing layer
        map.setPaintProperty(layerBorderId, "line-color", layer.color);
        map.setPaintProperty(layerBorderId, "line-width", isActive ? 2.5 : 1.5);
        map.setPaintProperty(
          layerBorderId,
          "line-opacity",
          isVisible ? (isActive ? 0.9 : 0.7) : 0
        );
        map.setLayoutProperty(
          layerBorderId,
          "visibility",
          isVisible ? "visible" : "none"
        );
      }
    });

    // Cleanup: Remove layers/sources for layers that no longer exist
    return () => {
      if (!map) return;

      // Get all current area layer IDs
      const currentLayerIds = new Set(layers.map((l) => l.id));

      // Find and remove orphaned area layers
      const allLayers = map.getStyle().layers || [];
      allLayers.forEach((layer) => {
        if (layer.id.startsWith("area-layer-")) {
          const match = layer.id.match(/area-layer-(\d+)-(fill|border)/);
          if (match) {
            const layerIdNum = parseInt(match[1], 10);
            if (!currentLayerIds.has(layerIdNum)) {
              try {
                map.removeLayer(layer.id);
              } catch (e) {
                // Layer might already be removed
              }
            }
          }
        }
      });

      // Remove orphaned sources
      Object.keys(map.getStyle().sources || {}).forEach((sourceId) => {
        if (sourceId.startsWith("area-layer-")) {
          const match = sourceId.match(/area-layer-(\d+)-source/);
          if (match) {
            const layerIdNum = parseInt(match[1], 10);
            if (!currentLayerIds.has(layerIdNum)) {
              try {
                map.removeSource(sourceId);
              } catch (e) {
                // Source might already be removed
              }
            }
          }
        }
      });
    };
  }, [map, isMapLoaded, layers, activeLayerId, data, ids.hoverLayerId]);

  // Update selected regions color when active layer changes
  useEffect(() => {
    if (!map || !layersLoaded) return;

    const activeLayer = layers?.find((l) => l.id === activeLayerId);
    const fillColor = activeLayer?.color || "#2563EB";
    const fillOpacity = 0.3; // Lower opacity for preview

    if (map.getLayer(ids.selectedLayerId)) {
      map.setPaintProperty(ids.selectedLayerId, "fill-color", fillColor);
      map.setPaintProperty(ids.selectedLayerId, "fill-opacity", fillOpacity);
      map.setPaintProperty(
        ids.selectedLayerId,
        "fill-outline-color",
        fillColor
      );
    }
  }, [map, layersLoaded, layers, activeLayerId, ids.selectedLayerId]);

  return { layersLoaded };
}
