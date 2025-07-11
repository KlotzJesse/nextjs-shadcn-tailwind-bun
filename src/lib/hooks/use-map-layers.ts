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

interface UseMapLayersProps {
  map: MapLibreMap | null;
  isMapLoaded: boolean;
  layerId: string;
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
  selectedRegions: string[];
  hoveredRegionId: string | null;
  getSelectedFeatureCollection: () => FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  >;
  getLabelPoints: (
    data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>
  ) => FeatureCollection<Geometry, GeoJsonProperties>;
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
  selectedRegions,
  hoveredRegionId,
  getSelectedFeatureCollection,
  getLabelPoints,
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
          "fill-opacity": 0.35,
          "fill-outline-color": "#102A43",
        },
      });
    }
    // 2. State boundaries line (above fill)
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
            "line-opacity": 0.8,
            "line-dasharray": [6, 3],
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        },
        `${layerId}-layer`
      );
    }
    // 3. Postal code border (above state boundaries line)
    if (!map.getLayer(`${layerId}-border`)) {
      safeAddLayer(
        {
          id: `${layerId}-border`,
          type: "line",
          source: ids.sourceId,
          paint: {
            "line-color": "#2563EB",
            "line-width": 0.7,
            "line-opacity": 0.3,
          },
        },
        statesData ? ids.stateLayerId : `${layerId}-layer`
      );
    }
    // 4. Selected postal code fill (above all static fills/lines)
    if (!map.getLayer(ids.selectedLayerId)) {
      safeAddLayer(
        {
          id: ids.selectedLayerId,
          type: "fill",
          source: ids.selectedSourceId,
          paint: {
            "fill-color": "#2563EB",
            "fill-opacity": 0.5,
            "fill-outline-color": "#1D4ED8",
          },
        },
        `${layerId}-border`
      );
    }
    // 5. Hover line (above all static lines/fills)
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
    // 6. State label (above all lines/fills)
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
        ids.hoverLayerId
      );
    }
    // 7. Postal code label (above all lines/fills but below state label)
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
        statesData ? "state-boundaries-label" : ids.hoverLayerId
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

  // Update selected features source when selection changes
  useEffect(() => {
    if (!map || !layersLoaded) return;
    const src = map.getSource(ids.selectedSourceId) as
      | GeoJSONSource
      | undefined;
    if (src && typeof src.setData === "function") {
      src.setData(getSelectedFeatureCollection());
    }
  }, [
    selectedRegions,
    getSelectedFeatureCollection,
    map,
    layersLoaded,
    ids.selectedSourceId,
  ]);

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
      const layerIds = [
        ids.labelLayerId,
        "state-boundaries-label",
        ids.hoverLayerId,
        ids.selectedLayerId,
        `${layerId}-border`,
        ids.stateLayerId,
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

  return { layersLoaded };
}
