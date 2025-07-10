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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDrivingRadiusSearch } from "@/lib/hooks/use-driving-radius-search";
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
  onDrivingRadiusSelect?: (
    coords: [number, number],
    radius: number,
    granularity: string,
    mode: "distance" | "time",
    method: "osrm" | "approximation"
  ) => void;
  granularity: string;
  triggerClassName?: string;
}

export function AddressAutocompleteEnhanced({
  onAddressSelect,
  onRadiusSelect,
  onDrivingRadiusSelect,
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
  const [searchMode, setSearchMode] = useState<
    "straight" | "distance" | "time"
  >("distance"); // Simplified: straight, driving distance, or driving time
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook for driving radius search
  const { performDrivingRadiusSearch } = useDrivingRadiusSearch();

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

  const handleRadiusConfirm = useStableCallback(async () => {
    if (selectedCoords) {
      const finalRadius = parseFloat(customRadiusInput);

      // Validate radius
      if (isNaN(finalRadius) || finalRadius < 0.1 || finalRadius > 200) {
        toast.error(
          "Bitte geben Sie einen gültigen Radius zwischen 0.1 und 200 ein"
        );
        return;
      }

      // Create the search promise for toast handling with enhanced feedback
      const searchPromise = async () => {
        if (searchMode === "straight") {
          // Use traditional straight-line radius search
          onRadiusSelect(selectedCoords, finalRadius, granularity);
          return `✅ ${finalRadius}km Luftlinie erfolgreich ausgewählt`;
        } else {
          // Use driving radius search (default to OSRM precision)
          const mode = searchMode === "distance" ? "distance" : "time";
          const method = "osrm"; // Always start with precision mode

          try {
            await performDrivingRadiusSearch(
              selectedCoords,
              finalRadius,
              granularity,
              mode,
              method
            );

            if (onDrivingRadiusSelect) {
              onDrivingRadiusSelect(
                selectedCoords,
                finalRadius,
                granularity,
                mode,
                method
              );
            }

            const unit = mode === "time" ? "min" : "km";
            const modeText = mode === "time" ? "Fahrzeit" : "Fahrstrecke";
            return `🎯 ${finalRadius}${unit} ${modeText} erfolgreich berechnet`;
          } catch (error) {
            console.error("Driving radius search failed:", error);
            throw new Error(
              `Fehler bei der ${
                mode === "time" ? "Fahrzeit" : "Fahrstrecke"
              }-Berechnung. Bitte versuchen Sie es erneut.`
            );
          }
        }
      };

      // Enhanced promise-based toast with better UX
      toast.promise(searchPromise(), {
        loading: `🔄 ${
          searchMode === "straight"
            ? "Luftlinie"
            : searchMode === "distance"
            ? "Fahrstrecke"
            : "Fahrzeit"
        } wird berechnet...`,
        success: (message) => message,
        error: (error) =>
          error.message || "Unerwarteter Fehler bei der Berechnung",
      });

      setRadiusDialogOpen(false);
      setSelectedCoords(null);
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDirectSelect(result);
                              }}
                              className="h-8 px-2"
                            >
                              <MapPinIcon className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Exakte Position auswählen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRadiusSelect(result);
                              }}
                              className="h-8 px-2"
                            >
                              <RadiusIcon className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Umkreis um Position auswählen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
              Wählen Sie Art und Größe des Suchradius
            </p>
          </DialogHeader>
          <div className="space-y-6">
            {/* Enhanced search mode selector with better UX */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Suchmethode wählen
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Wählen Sie, wie der Umkreis berechnet werden soll
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant={searchMode === "straight" ? "default" : "outline"}
                  size="default"
                  onClick={() => setSearchMode("straight")}
                  className="h-auto p-4 text-left flex flex-col items-start gap-1"
                  role="radio"
                  aria-checked={searchMode === "straight"}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-medium">📏 Luftlinie</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto">
                      Schnell
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Direkte Entfernung (wie der Vogel fliegt) - ⚡ Sofortige
                    Ergebnisse
                  </span>
                </Button>
                <Button
                  variant={searchMode === "distance" ? "default" : "outline"}
                  size="default"
                  onClick={() => setSearchMode("distance")}
                  className="h-auto p-4 text-left flex flex-col items-start gap-1"
                  role="radio"
                  aria-checked={searchMode === "distance"}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-medium">
                      🛣️ Fahrstrecke (km)
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-auto">
                      Präzise
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Tatsächliche Straßenentfernung - 🎯 OSRM-Routenberechnung
                  </span>
                </Button>
                <Button
                  variant={searchMode === "time" ? "default" : "outline"}
                  size="default"
                  onClick={() => setSearchMode("time")}
                  className="h-auto p-4 text-left flex flex-col items-start gap-1"
                  role="radio"
                  aria-checked={searchMode === "time"}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-medium">
                      ⏱️ Fahrzeit (min)
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-auto">
                      Realistisch
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Geschätzte Fahrtdauer - 🚗 Verkehrsbedingungen
                    berücksichtigt
                  </span>
                </Button>
              </div>
            </div>

            {/* Smart preset buttons with contextual values */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">
                  Häufige Werte für{" "}
                  {searchMode === "straight"
                    ? "Luftlinie"
                    : searchMode === "distance"
                    ? "Fahrstrecke"
                    : "Fahrzeit"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {searchMode === "straight"
                    ? "Direkte Entfernung in km"
                    : searchMode === "distance"
                    ? "Tatsächliche Straßenentfernung in km"
                    : "Realistische Fahrtdauer in Minuten"}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(searchMode === "time"
                  ? [5, 15, 30, 45] // Time presets in minutes
                  : [1, 5, 10, 25]
                ) // Distance presets in km
                  .map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => syncInputWithRadius(preset)}
                      className="text-xs font-medium"
                    >
                      {preset}
                      {searchMode === "time" ? "min" : "km"}
                    </Button>
                  ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(searchMode === "time"
                  ? [60, 90, 120, 180] // Extended time presets
                  : [50, 75, 100, 150]
                ) // Extended distance presets
                  .map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomRadiusInput(preset.toString());
                        setRadius(preset);
                      }}
                      className="text-xs font-medium"
                    >
                      {preset}
                      {searchMode === "time" ? "min" : "km"}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Slider for 0.5-200 range */}
            <div className="space-y-2">
              <Label htmlFor="radius-slider">
                Präzise Auswahl: {radius} {searchMode === "time" ? "min" : "km"}
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
                <span>0.5{searchMode === "time" ? "min" : "km"}</span>
                <span>200{searchMode === "time" ? "min" : "km"}</span>
              </div>
            </div>

            {/* Direct input for any value */}
            <div className="space-y-2">
              <Label htmlFor="radius-input">
                Exakte Eingabe (0.1-200{searchMode === "time" ? "min" : "km"})
              </Label>
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
                Werte zwischen 0.1{searchMode === "time" ? "min" : "km"} und 200
                {searchMode === "time" ? "min" : "km"} sind möglich
              </div>
            </div>

            {/* Enhanced result summary with accuracy indicators */}
            <div className="text-sm border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Ausgewählter Radius:
                </span>
                <span className="font-medium text-foreground">
                  {customRadiusInput}
                  {searchMode === "time" ? "min" : "km"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suchmethode:</span>
                <span className="font-medium text-foreground">
                  {searchMode === "straight"
                    ? "📏 Luftlinie"
                    : searchMode === "distance"
                    ? "🛣️ Fahrstrecke"
                    : "⏱️ Fahrzeit"}
                </span>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg mt-3">
                <p className="text-sm font-medium mb-1">
                  ✅ Alle PLZ innerhalb von {customRadiusInput}
                  {searchMode === "time" ? "min" : "km"}{" "}
                  {searchMode === "straight"
                    ? "Luftlinie"
                    : searchMode === "distance"
                    ? "Fahrstrecke"
                    : "Fahrzeit"}{" "}
                  werden ausgewählt
                </p>
                {searchMode !== "straight" && (
                  <div className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                    <span>🎯</span>
                    <span>Präzisionsmodus (OSRM) für höchste Genauigkeit</span>
                  </div>
                )}
                {searchMode === "straight" && (
                  <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                    <span>⚡</span>
                    <span>Schnellste Berechnung, sofortige Ergebnisse</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRadiusDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button onClick={handleRadiusConfirm}>
                {customRadiusInput}
                {searchMode === "time" ? "min" : "km"}{" "}
                {searchMode === "straight"
                  ? "Luftlinie"
                  : searchMode === "distance"
                  ? "Fahrstrecke"
                  : "Fahrzeit"}{" "}
                auswählen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
