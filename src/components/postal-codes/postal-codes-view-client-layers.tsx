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
import { useAreaLayers } from "@/lib/hooks/use-area-layers";
import { useAreaAutosave } from "@/lib/hooks/use-area-autosave";
import {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import { ChevronsUpDownIcon, FileUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import {
  AddressAutocompleteErrorBoundary,
  MapErrorBoundary,
} from "@/components/ui/error-boundaries";
import {
  AddressAutocompleteSkeleton,
  MapSkeleton,
} from "@/components/ui/loading-skeletons";
import { LayerManagementPanel } from "@/components/areas/layer-management-panel";

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

interface PostalCodesViewClientProps {
  initialData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  defaultGranularity: string;
}

export default function PostalCodesViewClientWithLayers({
  initialData,
  statesData,
  defaultGranularity,
}: PostalCodesViewClientProps) {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [data] =
    useState<FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>>(
      initialData
    );
  const router = useRouter();
  const mapState = useMapState();
  const {
    areaId,
    activeLayerId,
    setActiveLayer,
    addSelectedRegions,
    clearSelectedRegions,
  } = mapState;

  const { layers, fetchLayers, addPostalCodesToLayer } = useAreaLayers(
    areaId || 0
  );
  const { scheduleAutosave } = useAreaAutosave(areaId || 0, activeLayerId);

  const { searchPostalCodes, selectPostalCode } = usePostalCodeSearch({ data });
  const { findPostalCodeByCoords } = usePostalCodeLookup({ data });

  const { performRadiusSearch } = useRadiusSearch({
    onRadiusComplete: (postalCodes) => {
      if (activeLayerId && areaId) {
        addPostalCodesToLayer(activeLayerId, postalCodes);
      } else {
        addSelectedRegions(postalCodes);
      }
    },
  });

  const { performDrivingRadiusSearch } = useDrivingRadiusSearch({
    onRadiusComplete: (postalCodes) => {
      if (activeLayerId && areaId) {
        addPostalCodesToLayer(activeLayerId, postalCodes);
      } else {
        addSelectedRegions(postalCodes);
      }
    },
  });

  const [postalCodeQuery, setPostalCodeQuery] = useState("");
  const [postalCodeOpen, setPostalCodeOpen] = useState(false);
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(
    null
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Load layers when area changes
  useEffect(() => {
    if (areaId) {
      fetchLayers();
      // Set first layer as active if none selected
      if (!activeLayerId && layers.length > 0) {
        setActiveLayer(layers[0].id);
      }
    }
  }, [areaId, fetchLayers]);

  const handleGranularityChange = (newGranularity: string) => {
    if (newGranularity !== defaultGranularity) {
      const granularityLabels: Record<string, string> = {
        "1digit": "1-stellig",
        "2digit": "2-stellig",
        "3digit": "3-stellig",
        "5digit": "5-stellig",
      };

      toast.success(
        `🔄 Wechsel zu ${
          granularityLabels[newGranularity] || newGranularity
        } PLZ-Ansicht...`,
        {
          duration: 2000,
        }
      );

      const query = areaId ? `?areaId=${areaId}` : "";
      router.push(`/postal-codes/${newGranularity}${query}`);
    }
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
          return `PLZ ${code} zu Layer hinzugefügt`;
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
    await performRadiusSearch(coords, radius, granularity);
  };

  // Handle bulk postal code import
  const handleImport = async (postalCodes: string[]) => {
    if (activeLayerId && areaId) {
      await addPostalCodesToLayer(activeLayerId, postalCodes);
      toast.success(`${postalCodes.length} PLZ zu Layer hinzugefügt`);
    } else {
      addSelectedRegions(postalCodes);
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
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const layerPostalCodes =
    activeLayer?.postalCodes?.map((pc) => pc.postalCode) || [];

  return (
    <div className="h-full relative">
      {/* Area required message */}
      {!areaId && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Kein Gebiet ausgewählt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Bitte wählen Sie ein Gebiet aus der Sidebar oder erstellen Sie
                ein neues Gebiet.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Layer Management Panel - Left side */}
      {areaId && (
        <div className="absolute top-4 left-4 z-30">
          <LayerManagementPanel
            areaId={areaId}
            activeLayerId={activeLayerId}
            onLayerSelect={handleLayerSelect}
          />
        </div>
      )}

      {/* Address and Postal Code Tools - horizontal, top right */}
      <div className="absolute top-4 right-4 z-30 flex flex-row gap-3 w-auto">
        <div className="w-80">
          <AddressAutocompleteErrorBoundary>
            <AddressAutocompleteEnhanced
              onAddressSelect={handleAddressSelect}
              onBoundarySelect={(codes) => handleImport(codes)}
              onRadiusSelect={handleRadiusSelect}
              performDrivingRadiusSearch={performDrivingRadiusSearch}
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
            layers={layers}
            activeLayerId={activeLayerId}
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
