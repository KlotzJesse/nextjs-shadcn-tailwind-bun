import { Button } from "@/components/ui/button";
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
import { ChevronsUpDownIcon } from "lucide-react";
import { useRef, useState } from "react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lon: string;
  lat: string;
  [key: string]: unknown;
}

interface AddressAutocompleteProps {
  onSelect: (coords: [number, number], label: string) => void;
  triggerClassName?: string;
  itemClassName?: string;
}

export function AddressAutocomplete({
  onSelect,
  triggerClassName = "",
  itemClassName = "",
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          value
        )}&addressdetails=1&limit=5`
      )
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
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
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${triggerClassName}`}
        >
          <span className="truncate block w-full text-left">
            {selectedLabel ? selectedLabel : "Adresse suchen..."}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder="Adresse suchen..."
            value={query}
            onValueChange={handleInputChange}
            autoFocus
            autoComplete="off"
          />
          <CommandList>
            {isLoading && (
              <div className="p-2 text-xs text-muted-foreground">Lädt...</div>
            )}
            {!isLoading && results.length === 0 && (
              <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
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
