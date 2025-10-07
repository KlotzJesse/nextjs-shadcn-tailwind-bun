"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDrivingRadiusSearch } from "@/lib/hooks/use-driving-radius-search";
import { usePostalCodeLookup } from "@/lib/hooks/use-postal-code-lookup";
import { usePostalCodeSearch } from "@/lib/hooks/use-postal-code-search";
import { useRadiusSearch } from "@/lib/hooks/use-radius-search";
import { useMapState } from "@/lib/url-state/map-state";
import { useAreaAutosave } from "@/lib/hooks/use-area-autosave";
import {
  addPostalCodesToLayerAction,
  removePostalCodesFromLayerAction,
  radiusSearchAction,
  drivingRadiusSearchAction,
} from "@/app/actions/area-actions";
import { areas, areaLayers } from "@/lib/schema/schema";
import type { InferSelectModel } from "drizzle-orm";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

type Area = InferSelectModel<typeof areas>;
type Layer = InferSelectModel<typeof areaLayers> & {
  postalCodes?: { postalCode: string }[];
};
import { ChevronsUpDownIcon, FileUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useOptimistic } from "react";
import { toast } from "sonner";

import {
  AddressAutocompleteErrorBoundary,
  MapErrorBoundary,
} from "@/components/ui/error-boundaries";
import {
  AddressAutocompleteSkeleton,
  MapSkeleton,
} from "@/components/ui/loading-skeletons";

const AddressAutocompleteEnhanced = dynamic(
  () =>
    import("./address-autocomplete-enhanced").then(
      (m) => m.AddressAutocompleteEnhanced
    ),
  {
    ssr: false,
    loading: () => <AddressAutocompleteSkeleton />,
  }
);

const PostalCodesMap = dynamic(
  () =>
    import("./postal-codes-map").then((m) => ({ default: m.PostalCodesMap })),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

const PostalCodeImportDialog = dynamic(
  () =>
    import("./postal-code-import-dialog").then((m) => ({
      default: m.PostalCodeImportDialog,
    })),
  {
    ssr: false,
  }
);

import {
  getGranularityLevel,
  getGranularityLabel,
  wouldGranularityChangeCauseDataLoss,
} from "@/lib/utils/granularity-utils";

interface PostalCodesViewClientWithLayersProps {
  initialData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  defaultGranularity: string;
  areaId: number;
  activeLayerId: number | null;
  initialAreas: Area[];
  initialArea: Area | null;
  initialLayers: Layer[];
  isViewingVersion?: boolean;
  versionId?: number | null;
}

export function PostalCodesViewClientWithLayers({
  initialData,
  statesData,
  defaultGranularity,
  areaId,
  activeLayerId: initialActiveLayerId,
  initialAreas,
  initialArea,
  initialLayers,
  isViewingVersion = false,
  versionId,
}: PostalCodesViewClientWithLayersProps) {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [data] =
    useState<FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>>(
      initialData
    );
  const router = useRouter();
  const mapState = useMapState();
  const { setActiveLayer } = mapState;

  // Optimistic state for layers
  const [optimisticLayers, updateOptimisticLayers] = useOptimistic(
    initialLayers,
    (
      currentLayers: Layer[],
      update: { type: "add" | "remove"; layerId: number; postalCodes: string[] }
    ) => {
      return currentLayers.map((layer) => {
        if (layer.id === update.layerId) {
          const currentCodes =
            layer.postalCodes?.map((pc) => pc.postalCode) || [];
          let newCodes: string[];

          if (update.type === "add") {
            newCodes = [...new Set([...currentCodes, ...update.postalCodes])];
          } else {
            newCodes = currentCodes.filter(
              (code) => !update.postalCodes.includes(code)
            );
          }

          return {
            ...layer,
            postalCodes: newCodes.map((code) => ({ postalCode: code })),
          };
        }
        return layer;
      });
    }
  );

  const [isPending, startTransition] = useTransition();
  // Use URL state for active layer instead of local state
  const activeLayerId = mapState.activeLayerId;

  // When viewing a version, we need special handling for layer updates
  const isWorkingWithVersion = isViewingVersion && versionId;

  // Server action wrappers with optimistic updates
  const addPostalCodesToLayer = async (
    layerId: number,
    postalCodes: string[]
  ) => {
    if (!areaId) {
      toast.error("Kein Bereich ausgewählt");
      return;
    }

    if (isWorkingWithVersion) {
      // When working with a version, this is a branching operation
      toast.info(
        `${postalCodes.length} PLZ hinzugefügt - wird in neuer Version gespeichert`,
        {
          duration: 3000,
        }
      );
    }

    startTransition(async () => {
      updateOptimisticLayers({ type: "add", layerId, postalCodes });

      try {
        const result = await addPostalCodesToLayerAction(
          areaId,
          layerId,
          postalCodes
        );
        if (!result.success) {
          throw new Error(result.error);
        }

        if (isWorkingWithVersion) {
          // Auto-suggest creating version after changes
          setTimeout(() => {
            toast.info(
              "Erstellen Sie eine neue Version um Ihre Änderungen zu speichern",
              {
                duration: 5000,
              }
            );
          }, 1000);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Fehler beim Hinzufügen der PLZ"
        );
      }
    });
  };

  const removePostalCodesFromLayer = async (
    layerId: number,
    postalCodes: string[]
  ) => {
    if (!areaId) {
      toast.error("Kein Bereich ausgewählt");
      return;
    }

    if (isWorkingWithVersion) {
      // When working with a version, this is a branching operation
      toast.info(
        `${postalCodes.length} PLZ entfernt - wird in neuer Version gespeichert`,
        {
          duration: 3000,
        }
      );
    }

    startTransition(async () => {
      updateOptimisticLayers({ type: "remove", layerId, postalCodes });

      try {
        const result = await removePostalCodesFromLayerAction(
          areaId,
          layerId,
          postalCodes
        );
        if (!result.success) {
          throw new Error(result.error);
        }

        if (isWorkingWithVersion) {
          // Auto-suggest creating version after changes
          setTimeout(() => {
            toast.info(
              "Erstellen Sie eine neue Version um Ihre Änderungen zu speichern",
              {
                duration: 5000,
              }
            );
          }, 1000);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Fehler beim Entfernen der PLZ"
        );
      }
    });
  };

  // Debug layer functions
  useEffect(() => {
    console.log(
      "[postal-codes-view-client-layers] Layer functions available:",
      {
        areaId,
        activeLayerId,
        addFunction: !!addPostalCodesToLayer,
        removeFunction: !!removePostalCodesFromLayer,
        layersCount: optimisticLayers.length,
      }
    );
  }, [areaId, activeLayerId, optimisticLayers.length]);

  const { scheduleAutosave } = useAreaAutosave(areaId || 0, activeLayerId);

  const { searchPostalCodes, selectPostalCode } = usePostalCodeSearch({ data });
  const { findPostalCodeByCoords } = usePostalCodeLookup({ data });

  const performRadiusSearch = async (searchData: {
    latitude: number;
    longitude: number;
    radius: number;
    granularity: string;
  }) => {
    const result = await radiusSearchAction(searchData);
    if (result.success && result.data) {
      const postalCodes = result.data.postalCodes;
      if (activeLayerId && areaId) {
        await addPostalCodesToLayer(activeLayerId, postalCodes);
        toast.success(`${postalCodes.length} PLZ zu Gebiet hinzugefügt`);
      } else {
        toast.warning("Bitte wählen Sie ein aktives Gebiet aus", {
          duration: 3000,
        });
      }
    } else {
      toast.error("Fehler bei der Radiussuche");
    }
  };

  // Wrapper function to match the expected interface for AddressAutocompleteEnhanced
  const performDrivingRadiusSearchWrapper = async (
    coordinates: [number, number],
    radius: number,
    granularity: string,
    mode: "distance" | "time",
    method: "osrm" | "approximation"
  ) => {
    await performDrivingRadiusSearch({
      latitude: coordinates[1],
      longitude: coordinates[0],
      maxDuration: radius, // Using radius as maxDuration for time mode
      granularity,
    });
  };

  const [postalCodeQuery, setPostalCodeQuery] = useState("");
  const [postalCodeOpen, setPostalCodeOpen] = useState(false);
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(
    null
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Set first layer as active if none selected
  useEffect(() => {
    if (!activeLayerId && optimisticLayers.length > 0) {
      const firstLayerId = optimisticLayers[0].id;
      setActiveLayer(firstLayerId);
    }
  }, [activeLayerId, optimisticLayers.length, setActiveLayer]);

  // Debug logging for layers
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PostalCodesViewClientWithLayers] Layers updated:", {
        count: optimisticLayers.length,
        areaId,
        activeLayerId,
        layers: optimisticLayers.map((l) => ({
          id: l.id,
          name: l.name,
          postalCodesCount: l.postalCodes?.length || 0,
        })),
      });
    }
  }, [optimisticLayers, areaId, activeLayerId]);

  const handleGranularityChange = async (newGranularity: string) => {
    if (newGranularity === defaultGranularity) return;

    // Check if area has postal codes that would be affected
    const hasPostalCodes = optimisticLayers.some(
      (layer) => layer.postalCodes && layer.postalCodes.length > 0
    );

    if (hasPostalCodes && areaId) {
      // Check if this change would cause data loss using utility function
      if (
        wouldGranularityChangeCauseDataLoss(
          defaultGranularity,
          newGranularity,
          hasPostalCodes
        )
      ) {
        try {
          // Clear all postal codes from all layers before switching
          for (const layer of optimisticLayers) {
            if (layer.postalCodes && layer.postalCodes.length > 0) {
              const codes = layer.postalCodes.map((pc) => pc.postalCode);
              await removePostalCodesFromLayer(layer.id, codes);
            }
          }
        } catch (error) {
          toast.error("Fehler beim Löschen der Regionen");
          return;
        }
      }
    }

    const newLabel = getGranularityLabel(newGranularity);

    // Show appropriate success message
    if (hasPostalCodes) {
      toast.success(`Wechsel zu ${newLabel} PLZ-Ansicht abgeschlossen`, {
        description: "Gebiete wurden entsprechend angepasst",
        duration: 3000,
      });
    } else {
      toast.success(`🔄 Wechsel zu ${newLabel} PLZ-Ansicht...`, {
        duration: 2000,
      });
    }

    const query = areaId ? `?areaId=${areaId}` : "";
    router.push(`/postal-codes/${newGranularity}${query}`);
  };

  // Handle direct address selection (pin icon)
  const handleAddressSelect = (
    coords: [number, number],
    _label: string,
    postalCode?: string
  ) => {
    const selectionPromise = async () => {
      const code = postalCode || findPostalCodeByCoords(coords[0], coords[1]);
      if (code) {
        if (activeLayerId && areaId) {
          await addPostalCodesToLayer(activeLayerId, [code]);
          return `PLZ ${code} zu Gebiet hinzugefügt`;
        } else {
          selectPostalCode(code);
          return `PLZ ${code} ausgewählt`;
        }
      } else {
        throw new Error("Keine PLZ-Region für diese Adresse gefunden");
      }
    };

    toast.promise(selectionPromise(), {
      loading: "📍 PLZ-Region wird ermittelt...",
      success: (message: string) => message,
      error: (error: unknown) =>
        error instanceof Error ? error.message : "Fehler bei PLZ-Auswahl",
    });
  };

  // Handle radius selection (radius icon)
  const handleRadiusSelect = async (
    coords: [number, number],
    radius: number,
    granularity: string
  ) => {
    await performRadiusSearch({
      latitude: coords[1],
      longitude: coords[0],
      radius,
      granularity,
    });
  };

  // Handle bulk postal code import
  const handleImport = async (postalCodes: string[]) => {
    if (activeLayerId && areaId) {
      await addPostalCodesToLayer(activeLayerId, postalCodes);
      toast.success(`${postalCodes.length} PLZ zu Gebiet hinzugefügt`);
    } else {
      toast.warning("Bitte wählen Sie ein aktives Gebiet aus", {
        duration: 3000,
      });
    }
  };

  const handleLayerSelect = (layerId: number) => {
    setActiveLayer(layerId);
  };

  // Get all postal codes for autocomplete
  const allPostalCodes = data.features
    .map((f) => f.properties?.code || f.properties?.PLZ || f.properties?.plz)
    .filter((code): code is string => Boolean(code));

  // Get current layer's postal codes for map display
  const activeLayer = optimisticLayers.find((l) => l.id === activeLayerId);
  const layerPostalCodes =
    activeLayer?.postalCodes?.map((pc) => pc.postalCode) || [];

  return (
    <div className="h-full relative">
      {/* Address and Postal Code Tools - horizontal, top right */}
      <div className="absolute top-4 right-4 z-30 flex flex-row gap-3 w-auto">
        <div className="w-80">
          <AddressAutocompleteErrorBoundary>
            <AddressAutocompleteEnhanced
              onAddressSelect={handleAddressSelect}
              onBoundarySelect={(codes) => handleImport(codes)}
              onRadiusSelect={handleRadiusSelect}
              performDrivingRadiusSearch={performDrivingRadiusSearchWrapper}
              granularity={defaultGranularity}
              triggerClassName="truncate"
            />
          </AddressAutocompleteErrorBoundary>
        </div>
        <div className="w-80">
          <Popover open={postalCodeOpen} onOpenChange={setPostalCodeOpen}>
            <PopoverTrigger asChild>
              <Button
                role="combobox"
                aria-expanded={postalCodeOpen}
                className="w-full justify-between truncate"
              >
                <span className="truncate block w-full text-left">
                  {selectedPostalCode ? selectedPostalCode : "PLZ auswählen..."}
                </span>
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
              <Command>
                <CommandInput
                  placeholder="PLZ suchen..."
                  value={postalCodeQuery}
                  onValueChange={(v) => {
                    setPostalCodeQuery(v);
                  }}
                  autoFocus
                  autoComplete="off"
                />
                <CommandList>
                  {allPostalCodes
                    .filter((code) =>
                      code.toLowerCase().includes(postalCodeQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((code) => (
                      <CommandItem
                        key={code}
                        value={code}
                        onSelect={async () => {
                          if (activeLayerId && areaId) {
                            await addPostalCodesToLayer(activeLayerId, [code]);
                          } else {
                            selectPostalCode(code);
                          }
                          setSelectedPostalCode(code);
                          setPostalCodeQuery("");
                          setPostalCodeOpen(false);
                        }}
                        className="cursor-pointer truncate"
                      >
                        <span className="truncate block w-full text-left">
                          {code || "Unbekannt"}
                        </span>
                      </CommandItem>
                    ))}
                  {allPostalCodes.filter((code) =>
                    code.toLowerCase().includes(postalCodeQuery.toLowerCase())
                  ).length === 0 && (
                    <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {/* Import Button - Opens the import dialog */}
        <div className="flex-shrink-0">
          <Button
            onClick={() => setImportDialogOpen(true)}
            size="default"
            className="h-10 px-4"
            title="PLZ-Regionen importieren"
          >
            <FileUpIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map with integrated tools */}
      <div className="h-full">
        <MapErrorBoundary>
          <PostalCodesMap
            data={data}
            statesData={statesData}
            onSearch={searchPostalCodes}
            granularity={defaultGranularity}
            onGranularityChange={handleGranularityChange}
            layers={optimisticLayers}
            activeLayerId={activeLayerId}
            areaId={areaId}
            addPostalCodesToLayer={addPostalCodesToLayer}
            removePostalCodesFromLayer={removePostalCodesFromLayer}
            isViewingVersion={isViewingVersion}
            versionId={versionId}
          />
        </MapErrorBoundary>
      </div>

      {/* Import Dialog */}
      <PostalCodeImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        data={data}
        granularity={defaultGranularity}
        onImport={handleImport}
      />
    </div>
  );
}
