import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useStableCallback } from "@/lib/hooks/use-stable-callback";
import { ChevronsUpDownIcon, MapPinIcon, RadiusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface GeocodeResult {
  id: number;
  display_name: string;
  coordinates: [number, number];
  postal_code?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface AddressAutocompleteEnhancedProps {
  onAddressSelect: (
    coords: [number, number],
    label: string,
    postalCode?: string
  ) => void;
  onRadiusSelect: (
    coords: [number, number],
    radius: number,
    granularity: string
  ) => void;
  granularity: string;
  triggerClassName?: string;
}

export function AddressAutocompleteEnhanced({
  onAddressSelect,
  onRadiusSelect,
  granularity,
  triggerClassName = "",
}: AddressAutocompleteEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [radiusDialogOpen, setRadiusDialogOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(
    null
  );
  const [radius, setRadius] = useState<number>(5);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>("5");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync input field with slider value
  const syncInputWithRadius = useStableCallback((newRadius: number) => {
    setRadius(newRadius);
    setCustomRadiusInput(newRadius.toString());
  });

  // Update radius from input and sync with slider if within range
  const handleRadiusInputChange = useStableCallback((inputValue: string) => {
    setCustomRadiusInput(inputValue);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 200) {
      setRadius(numValue);
    }
  });

  const handleInputChange = useStableCallback((value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: value,
            includePostalCode: true,
            limit: 8,
          }),
        });

        if (!response.ok) {
          throw new Error("Geocoding failed");
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Geocoding error:", error);
        setResults([]);
        toast.error("Adresssuche fehlgeschlagen");
      } finally {
        setIsLoading(false);
      }
    }, 300);
  });

  // Utility function to convert postal code to granularity format
  const convertPostalCodeToGranularity = useStableCallback(
    (postalCode: string, granularityLevel: string): string => {
      if (!postalCode) return postalCode;

      // Remove any non-digit characters and ensure it's a string
      const cleanCode = postalCode.replace(/\D/g, "");

      switch (granularityLevel) {
        case "1digit":
          return cleanCode.substring(0, 1);
        case "2digit":
          return cleanCode.substring(0, 2);
        case "3digit":
          return cleanCode.substring(0, 3);
        case "5digit":
        default:
          return cleanCode;
      }
    }
  );

  const handleDirectSelect = useStableCallback((result: GeocodeResult) => {
    setSelectedLabel(result.display_name);
    setQuery("");
    setResults([]);
    setOpen(false);

    // Convert postal code to match current granularity
    const adjustedPostalCode = result.postal_code
      ? convertPostalCodeToGranularity(result.postal_code, granularity)
      : result.postal_code;

    onAddressSelect(
      result.coordinates,
      result.display_name,
      adjustedPostalCode
    );
  });

  const handleRadiusSelect = useStableCallback((result: GeocodeResult) => {
    setSelectedCoords(result.coordinates);
    setSelectedLabel(result.display_name);
    setQuery("");
    setResults([]);
    setOpen(false);
    setRadiusDialogOpen(true);
  });

  const handleRadiusConfirm = useStableCallback(() => {
    if (selectedCoords) {
      const finalRadius = parseFloat(customRadiusInput);

      // Validate radius
      if (isNaN(finalRadius) || finalRadius < 0.1 || finalRadius > 200) {
        toast.error(
          "Bitte geben Sie einen gültigen Radius zwischen 0.1km und 200km ein"
        );
        return;
      }

      onRadiusSelect(selectedCoords, finalRadius, granularity);
      setRadiusDialogOpen(false);
      setSelectedCoords(null);
      toast.success(`${finalRadius}km Umkreis um Standort ausgewählt`);
    }
  });

  const formatDisplayName = (result: GeocodeResult): string => {
    if (result.postal_code) {
      return `${result.postal_code} - ${result.city || result.display_name}`;
    }
    return result.display_name;
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between ${triggerClassName}`}
          >
            <span className="truncate block w-full text-left">
              {selectedLabel ? selectedLabel : "PLZ oder Adresse suchen..."}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput
              placeholder="PLZ oder Adresse suchen..."
              value={query}
              onValueChange={handleInputChange}
              autoFocus
              autoComplete="off"
            />
            <CommandList>
              {isLoading && (
                <div className="p-3 text-sm text-muted-foreground">
                  Suche läuft...
                </div>
              )}
              {!isLoading && results.length === 0 && query.length >= 2 && (
                <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
              )}
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.display_name}
                  className="p-0"
                  onSelect={() => {
                    // Prevent default selection behavior, we handle it with buttons
                  }}
                >
                  <div className="flex items-center gap-2 p-2 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {formatDisplayName(result)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.display_name}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectSelect(result);
                        }}
                        className="h-8 px-2"
                        title="Standort auswählen"
                      >
                        <MapPinIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRadiusSelect(result);
                        }}
                        className="h-8 px-2"
                        title="Umkreis um Standort auswählen"
                      >
                        <RadiusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={radiusDialogOpen} onOpenChange={setRadiusDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Umkreis auswählen</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Wählen Sie den gewünschten Radius für die PLZ-Auswahl
            </p>
          </DialogHeader>
          <div className="space-y-6">
            {/* Quick preset buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Häufige Entfernungen
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => syncInputWithRadius(preset)}
                    className="text-xs"
                  >
                    {preset}km
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[50, 75, 100, 150].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomRadiusInput(preset.toString());
                      setRadius(preset);
                    }}
                    className="text-xs"
                  >
                    {preset}km
                  </Button>
                ))}
              </div>
            </div>

            {/* Slider for 0.5-200km range */}
            <div className="space-y-2">
              <Label htmlFor="radius-slider">
                Präzise Auswahl (0.5-200km): {radius} km
              </Label>
              <Slider
                id="radius-slider"
                min={0.5}
                max={200}
                step={0.5}
                value={[radius]}
                onValueChange={(value) => syncInputWithRadius(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5km</span>
                <span>200km</span>
              </div>
            </div>

            {/* Direct input for any value */}
            <div className="space-y-2">
              <Label htmlFor="radius-input">Exakte Eingabe (0.1-200km)</Label>
              <Input
                id="radius-input"
                type="number"
                min="0.1"
                max="200"
                step="0.1"
                value={customRadiusInput}
                onChange={(e) => handleRadiusInputChange(e.target.value)}
                placeholder="z.B. 75.5"
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Werte zwischen 0.1km und 200km sind möglich
              </div>
            </div>

            <div className="text-sm text-muted-foreground border-t pt-4">
              Alle PLZ innerhalb von{" "}
              <span className="font-medium text-foreground">
                {customRadiusInput}km
              </span>{" "}
              des gewählten Standorts werden ausgewählt.
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRadiusDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button onClick={handleRadiusConfirm}>
                {customRadiusInput}km Umkreis auswählen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
