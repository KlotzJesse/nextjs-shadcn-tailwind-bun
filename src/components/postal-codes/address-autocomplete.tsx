"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronsUpDownIcon, Loader2 } from "lucide-react";

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

interface AddressAutocompleteProps {
  onSelect: (coords: [number, number], label: string) => void;
  triggerClassName?: string;
  itemClassName?: string;
  placeholder?: string;
}

export function AddressAutocomplete({
  onSelect,
  triggerClassName = "",
  itemClassName = "",
  placeholder = "Search address...",
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            value
          )}&addressdetails=1&limit=5&countrycodes=de`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) throw new Error("Search failed");

        const data: NominatimResult[] = await response.json();
        setResults(data);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Address search failed:", error);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (result: NominatimResult) => {
    setSelectedLabel(result.display_name);
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(
      [parseFloat(result.lon), parseFloat(result.lat)],
      result.display_name
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${triggerClassName}`}
        >
          <span className="truncate block w-full text-left">
            {selectedLabel ? selectedLabel : "Search address..."}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={handleInputChange}
            autoFocus
            autoComplete="off"
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            )}
            {!isLoading && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {results.map((result: NominatimResult) => (
              <CommandItem
                key={result.place_id}
                value={result.display_name}
                onSelect={() => handleSelect(result)}
                className={`cursor-pointer ${itemClassName}`}
              >
                <span className="truncate block w-full text-left">
                  {result.display_name}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
