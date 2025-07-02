"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings,
  Layers,
  MousePointer,
  Move3D,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapData } from "@/lib/types";
import { MAP_DEFAULTS } from "@/lib/types";
import {
  useMapSelection,
  useMapPerformance,
} from "@/lib/providers/map-provider";
import { SpatialIndex } from "@/lib/utils/spatial-index";

interface MapViewerProps {
  data: MapData;
  className?: string;
  onFeatureHover?: (featureId: string | null) => void;
  onFeatureClick?: (featureId: string) => void;
}

type InteractionMode = "select" | "pan" | "zoom";

export function MapViewer({
  data,
  className,
  onFeatureHover,
  onFeatureClick,
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const spatialIndex = useRef<SpatialIndex | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MAP_DEFAULTS.ZOOM);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("select");
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const { selectedRegions, toggleRegion } = useMapSelection();
  const { addMetric } = useMapPerformance();

  // Initialize spatial index
  useEffect(() => {
    if (data?.features) {
      const startTime = performance.now();
      spatialIndex.current = new SpatialIndex(data.features);
      const endTime = performance.now();

      addMetric({
        operation: "Spatial Index Creation",
        duration: endTime - startTime,
        featuresProcessed: data.features.length,
        timestamp: new Date(),
      });
    }
  }, [data, addMetric]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !data) return;

    const initializeMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const maplibregl = (await import("maplibre-gl")).default;

        if (mapInstance.current) {
          mapInstance.current.remove();
        }

        mapInstance.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: {
            version: 8,
            sources: {
              "postal-data": {
                type: "geojson",
                data: data,
              },
            },
            layers: [
              {
                id: "postal-fill",
                type: "fill",
                source: "postal-data",
                paint: {
                  "fill-color": [
                    "case",
                    ["in", ["get", "id"], ["literal", selectedRegions]],
                    "#2563eb",
                    "#e2e8f0",
                  ],
                  "fill-opacity": [
                    "case",
                    ["in", ["get", "id"], ["literal", selectedRegions]],
                    0.8,
                    0.3,
                  ],
                },
              },
              {
                id: "postal-stroke",
                type: "line",
                source: "postal-data",
                paint: {
                  "line-color": "#1e293b",
                  "line-width": [
                    "case",
                    ["in", ["get", "id"], ["literal", selectedRegions]],
                    2,
                    0.5,
                  ],
                },
              },
              {
                id: "postal-hover",
                type: "fill",
                source: "postal-data",
                paint: {
                  "fill-color": "#3b82f6",
                  "fill-opacity": 0.6,
                },
                filter: ["==", "id", ""],
              },
            ],
          },
          center: MAP_DEFAULTS.CENTER,
          zoom: MAP_DEFAULTS.ZOOM,
          maxZoom: MAP_DEFAULTS.MAX_ZOOM,
          minZoom: MAP_DEFAULTS.MIN_ZOOM,
        });

        // Add event listeners
        mapInstance.current.on("load", () => {
          setIsLoaded(true);
        });

        mapInstance.current.on("zoom", () => {
          setCurrentZoom(mapInstance.current.getZoom());
        });

        // Feature interaction
        mapInstance.current.on("mousemove", "postal-fill", (e: any) => {
          if (e.features && e.features.length > 0) {
            const featureId = e.features[0].properties.id;
            setHoveredFeature(featureId);
            onFeatureHover?.(featureId);

            // Update hover layer
            mapInstance.current.setFilter("postal-hover", [
              "==",
              "id",
              featureId,
            ]);
            mapInstance.current.getCanvas().style.cursor = "pointer";
          }
        });

        mapInstance.current.on("mouseleave", "postal-fill", () => {
          setHoveredFeature(null);
          onFeatureHover?.(null);
          mapInstance.current.setFilter("postal-hover", ["==", "id", ""]);
          mapInstance.current.getCanvas().style.cursor = "";
        });

        mapInstance.current.on("click", "postal-fill", (e: any) => {
          if (
            e.features &&
            e.features.length > 0 &&
            interactionMode === "select"
          ) {
            const featureId = e.features[0].properties.id;
            const startTime = performance.now();

            toggleRegion(featureId);
            onFeatureClick?.(featureId);

            const endTime = performance.now();
            addMetric({
              operation: "Feature Selection",
              duration: endTime - startTime,
              featuresProcessed: 1,
              timestamp: new Date(),
            });
          }
        });
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [
    data,
    interactionMode,
    addMetric,
    toggleRegion,
    onFeatureHover,
    onFeatureClick,
  ]);

  // Update selected regions
  useEffect(() => {
    if (mapInstance.current && isLoaded) {
      mapInstance.current.setPaintProperty("postal-fill", "fill-color", [
        "case",
        ["in", ["get", "id"], ["literal", selectedRegions]],
        "#2563eb",
        "#e2e8f0",
      ]);

      mapInstance.current.setPaintProperty("postal-stroke", "line-width", [
        "case",
        ["in", ["get", "id"], ["literal", selectedRegions]],
        2,
        0.5,
      ]);
    }
  }, [selectedRegions, isLoaded]);

  const handleZoomIn = useCallback(() => {
    if (mapInstance.current) {
      mapInstance.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstance.current) {
      mapInstance.current.zoomOut();
    }
  }, []);

  const handleFitBounds = useCallback(() => {
    if (mapInstance.current && data) {
      // Calculate bounds from data
      let minLng = Infinity,
        minLat = Infinity,
        maxLng = -Infinity,
        maxLat = -Infinity;

      data.features.forEach((feature) => {
        if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates[0].forEach(([lng, lat]) => {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          });
        }
      });

      if (
        isFinite(minLng) &&
        isFinite(maxLng) &&
        isFinite(minLat) &&
        isFinite(maxLat)
      ) {
        mapInstance.current.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 20 }
        );
      }
    }
  }, [data]);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px]"
        style={{ background: "#f8fafc" }}
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-background border rounded-md shadow-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={currentZoom >= MAP_DEFAULTS.MAX_ZOOM}
                  className="rounded-none rounded-t-md"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={currentZoom <= MAP_DEFAULTS.MIN_ZOOM}
                  className="rounded-none rounded-b-md border-t"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Map Tools */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleFitBounds}>
              <Maximize className="h-4 w-4 mr-2" />
              Fit to Data
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Layers className="h-4 w-4 mr-2" />
              Layer Options
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Interaction Mode Toggle */}
      <div className="absolute top-4 left-4 flex gap-1 bg-background border rounded-md shadow-sm z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={interactionMode === "select" ? "default" : "ghost"}
                size="sm"
                onClick={() => setInteractionMode("select")}
                className="rounded-none rounded-l-md"
              >
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select Mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={interactionMode === "pan" ? "default" : "ghost"}
                size="sm"
                onClick={() => setInteractionMode("pan")}
                className="rounded-none rounded-r-md"
              >
                <Move3D className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pan Mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        <Badge variant="secondary" className="text-xs">
          Zoom: {currentZoom.toFixed(1)}
        </Badge>
        {hoveredFeature && (
          <Badge variant="outline" className="text-xs">
            {hoveredFeature}
          </Badge>
        )}
        <Badge variant={isLoaded ? "default" : "secondary"} className="text-xs">
          {isLoaded ? "Ready" : "Loading..."}
        </Badge>
      </div>
    </Card>
  );
}
