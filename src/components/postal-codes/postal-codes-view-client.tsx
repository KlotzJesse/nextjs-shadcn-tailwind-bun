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
import {
    FeatureCollection,
    GeoJsonProperties,
    MultiPolygon,
    Polygon,
} from "geojson";
import { ChevronsUpDownIcon, FileUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    import("./postal-code-import-dialog").then(
      (m) => ({ default: m.PostalCodeImportDialog })
    ),
  {
    ssr: false,
  }
);

interface PostalCodesViewClientProps {
  initialData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  statesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  defaultGranularity: string;
}

export default function PostalCodesViewClient({
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
  const { addSelectedRegions } = useMapState();
  const { searchPostalCodes, selectPostalCode } = usePostalCodeSearch({ data });
  const { findPostalCodeByCoords } = usePostalCodeLookup({ data });
  const { performRadiusSearch } = useRadiusSearch({
    onRadiusComplete: (postalCodes) => {
      // Add all postal codes from radius search to selection at once
      addSelectedRegions(postalCodes);
    },
  });

  const { performDrivingRadiusSearch } = useDrivingRadiusSearch({
    onRadiusComplete: (postalCodes) => {
      // Add all postal codes from driving radius search to selection at once
      addSelectedRegions(postalCodes);
    },
  });
  const [postalCodeQuery, setPostalCodeQuery] = useState("");
  const [postalCodeOpen, setPostalCodeOpen] = useState(false);
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(
    null
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

      router.push(`/postal-codes/${newGranularity}`);
    }
  };

  // Handle direct address selection (pin icon)
  const handleAddressSelect = (
    coords: [number, number],
    _label: string,
    postalCode?: string
  ) => {
    const selectionPromise = async () => {
      if (postalCode) {
        // If we have a postal code from geocoding, use it directly
        selectPostalCode(postalCode);
        return `PLZ ${postalCode} ausgewählt`;
      } else {
        // Otherwise, find the postal code by coordinates
        const foundCode = findPostalCodeByCoords(coords[0], coords[1]);
        if (foundCode) {
          selectPostalCode(foundCode);
          return `PLZ ${foundCode} ausgewählt`;
        } else {
          throw new Error("Keine PLZ-Region für diese Adresse gefunden");
        }
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
  const handleImport = (postalCodes: string[]) => {
    addSelectedRegions(postalCodes);
  };

  // Get all postal codes for autocomplete
  const allPostalCodes = data.features
    .map((f) => f.properties?.code || f.properties?.PLZ || f.properties?.plz)
    .filter((code): code is string => Boolean(code));

  return (
    <div className="h-full relative">
      {/* Address and Postal Code Tools - horizontal, top right */}
      <div className="absolute top-4 right-4 z-30 flex flex-row gap-3 w-auto">
        <div className="w-80">
          <AddressAutocompleteErrorBoundary>
            <AddressAutocompleteEnhanced
              onAddressSelect={handleAddressSelect}
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
                        onSelect={() => {
                          selectPostalCode(code);
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
            variant="outline"
            size="default"
            className="h-10 px-4"
            title="PLZ-Regionen importieren"
          >
            <FileUpIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Search Results Panel - Only show when there are results */}
      {searchResults.length > 0 && (
        <div className="absolute top-24 right-4 z-10 w-64">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Suchergebnisse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchResults.map((result: string) => (
                  <div
                    key={result}
                    className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      selectPostalCode(result);
                      setSearchResults([]); // Clear results after selection
                    }}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Map with integrated tools */}
      <div className="h-full">
        <MapErrorBoundary>
          <PostalCodesMap
            data={data}
            statesData={statesData}
            onSearch={searchPostalCodes}
            granularity={defaultGranularity}
            onGranularityChange={handleGranularityChange}
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
