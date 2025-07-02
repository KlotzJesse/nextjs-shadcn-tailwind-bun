"use client";

import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapData } from "@/lib/types";
import { useMapSelection } from "@/lib/providers/map-provider";

interface SearchPanelProps {
  data: MapData;
  className?: string;
}

interface SearchResult {
  id: string;
  name: string;
  type: "postal-code" | "region";
  isSelected: boolean;
}

export function SearchPanel({ data, className }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { selectedRegions, selectRegion, deselectRegion, toggleRegion } =
    useMapSelection();

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    data.features.forEach((feature) => {
      const id =
        feature.properties.id ||
        feature.properties.PLZ ||
        feature.properties.plz;
      const name = feature.properties.name || id;

      if (!id) return;

      // Search by ID, PLZ, or name
      const searchableText = [
        id,
        name,
        feature.properties.PLZ,
        feature.properties.plz,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(query)) {
        results.push({
          id,
          name: name || id,
          type: "postal-code",
          isSelected: selectedRegions.includes(id),
        });
      }
    });

    // Sort results: exact matches first, then selected, then alphabetical
    return results
      .sort((a, b) => {
        const aExact =
          a.id.toLowerCase() === query || a.name.toLowerCase() === query;
        const bExact =
          b.id.toLowerCase() === query || b.name.toLowerCase() === query;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;

        return a.name.localeCompare(b.name);
      })
      .slice(0, 50); // Limit results for performance
  }, [searchQuery, data.features, selectedRegions]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      toggleRegion(result.id);
      setIsOpen(false);
    },
    [toggleRegion]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setIsOpen(false);
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Regions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder="Search postal codes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsOpen(true);
                }}
                className="pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search postal codes..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No regions found.</CommandEmpty>
                <CommandGroup>
                  {searchResults.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelect(result)}
                      className={cn(
                        "flex items-center justify-between",
                        result.isSelected && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{result.id}</div>
                          {result.name !== result.id && (
                            <div className="text-xs text-muted-foreground">
                              {result.name}
                            </div>
                          )}
                        </div>
                      </div>
                      {result.isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Separator />

        {/* Recent Searches or Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setSearchQuery("10")}
            >
              Berlin (10xxx)
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setSearchQuery("80")}
            >
              Munich (80xxx)
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => setSearchQuery("20")}
            >
              Hamburg (20xxx)
            </Badge>
          </div>
        </div>

        {/* Search Stats */}
        {searchQuery && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Found {searchResults.length} region
              {searchResults.length === 1 ? "" : "s"}
              matching "{searchQuery}"
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
