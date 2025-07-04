"use client";

import { useState } from "react";
import { PostalCodesMap } from "./postal-codes-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import type { MapData } from "@/lib/types";
import { AddressAutocomplete } from "./address-autocomplete";
import { usePostalCodeSearch } from "@/lib/hooks/use-postal-code-search";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronsUpDownIcon } from "lucide-react";

interface PostalCodesViewProps {
  initialData: MapData;
  defaultGranularity: string;
  statesData?: MapData | null;
}

export function PostalCodesView({
  initialData,
  defaultGranularity,
  statesData,
}: PostalCodesViewProps) {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [data] = useState<MapData>(initialData);
  const router = useRouter();
  const { searchPostalCodes, selectPostalCode } = usePostalCodeSearch({ data });
  const [postalCodeQuery, setPostalCodeQuery] = useState("");
  const [postalCodeOpen, setPostalCodeOpen] = useState(false);
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(
    null
  );

  const handleGranularityChange = (newGranularity: string) => {
    if (newGranularity !== defaultGranularity) {
      router.push(`/postal-codes/${newGranularity}`);
    }
  };

  // Helper: find postal code region containing a point
  const findPostalCodeByCoords = (lng: number, lat: number) => {
    for (const feature of data.features) {
      if (feature.geometry.type === "Polygon") {
        const polygon = feature.geometry.coordinates[0];
        if (isPointInPolygon([lng, lat], polygon as number[][])) {
          return (
            feature.properties?.id ||
            feature.properties?.PLZ ||
            feature.properties?.plz
          );
        }
      } else if (feature.geometry.type === "MultiPolygon") {
        for (const poly of feature.geometry.coordinates) {
          if (Array.isArray(poly) && Array.isArray(poly[0])) {
            if (isPointInPolygon([lng, lat], poly[0] as number[][])) {
              return (
                feature.properties?.id ||
                feature.properties?.PLZ ||
                feature.properties?.plz
              );
            }
          }
        }
      }
    }
    return null;
  };

  // Point-in-polygon helper (ray-casting)
  function isPointInPolygon(
    point: [number, number],
    polygon: number[][]
  ): boolean {
    let inside = false;
    const [x, y] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Handle address select
  const handleAddressSelect = (coords: [number, number]) => {
    const [lng, lat] = coords;
    const postalCode = findPostalCodeByCoords(lng, lat);
    if (postalCode) {
      selectPostalCode(postalCode);
    } else {
      alert("No postal code region found for this address.");
    }
  };

  // Get all postal codes for autocomplete
  const allPostalCodes = data.features
    .map((f) => f.properties?.id || f.properties?.PLZ || f.properties?.plz)
    .filter((code): code is string => Boolean(code));

  return (
    <div className="h-full relative">
      {/* Address and Postal Code Tools - horizontal, top right */}
      <div className="absolute top-4 right-4 z-30 flex flex-row gap-3 w-auto">
        <div className="w-80">
          <AddressAutocomplete
            onSelect={handleAddressSelect}
            triggerClassName="truncate"
            itemClassName="truncate"
          />
        </div>
        <div className="w-80">
          <Popover open={postalCodeOpen} onOpenChange={setPostalCodeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={postalCodeOpen}
                className="w-full justify-between truncate"
              >
                <span className="truncate block w-full text-left">
                  {selectedPostalCode
                    ? selectedPostalCode
                    : "Select postal code..."}
                </span>
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search postal code..."
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
                          {code || "Unknown"}
                        </span>
                      </CommandItem>
                    ))}
                  {allPostalCodes.filter((code) =>
                    code.toLowerCase().includes(postalCodeQuery.toLowerCase())
                  ).length === 0 && (
                    <CommandEmpty>No results found.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Search Results Panel - Only show when there are results */}
      {searchResults.length > 0 && (
        <div className="absolute top-24 right-4 z-10 w-64">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Results</CardTitle>
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
        <PostalCodesMap
          data={data}
          onSearch={searchPostalCodes}
          granularity={defaultGranularity}
          onGranularityChange={handleGranularityChange}
          statesData={statesData}
        />
      </div>
    </div>
  );
}
