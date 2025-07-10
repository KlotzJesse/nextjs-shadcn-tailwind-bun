import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { ChevronsUpDownIcon, MapPinIcon, RadiusIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  onAddressSelect: (coords: [number, number], label: string, postalCode?: string) => void;
  onRadiusSelect: (coords: [number, number], radius: number, granularity: string) => void;
  granularity: string;
  triggerClassName?: string;
}

export function AddressAutocompleteEnhanced({
  onAddressSelect,
  onRadiusSelect,
  granularity,
  triggerClassName = '',
}: AddressAutocompleteEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [radiusDialogOpen, setRadiusDialogOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: value,
            includePostalCode: true,
            limit: 8,
          }),
        });

        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Geocoding error:', error);
        setResults([]);
        toast.error('Address search failed');
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const handleDirectSelect = useCallback((result: GeocodeResult) => {
    setSelectedLabel(result.display_name);
    setQuery('');
    setResults([]);
    setOpen(false);
    onAddressSelect(result.coordinates, result.display_name, result.postal_code);
  }, [onAddressSelect]);

  const handleRadiusSelect = useCallback((result: GeocodeResult) => {
    setSelectedCoords(result.coordinates);
    setSelectedLabel(result.display_name);
    setQuery('');
    setResults([]);
    setOpen(false);
    setRadiusDialogOpen(true);
  }, []);

  const handleRadiusConfirm = useCallback(() => {
    if (selectedCoords) {
      onRadiusSelect(selectedCoords, radius, granularity);
      setRadiusDialogOpen(false);
      setSelectedCoords(null);
      toast.success(`Selected ${radius}km radius around location`);
    }
  }, [selectedCoords, radius, granularity, onRadiusSelect]);

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
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between ${triggerClassName}`}
          >
            <span className="truncate block w-full text-left">
              {selectedLabel ? selectedLabel : 'Search address or postal code...'}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput
              placeholder="Search address or postal code..."
              value={query}
              onValueChange={handleInputChange}
              autoFocus
              autoComplete="off"
            />
            <CommandList>
              {isLoading && (
                <div className="p-3 text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && results.length === 0 && query.length >= 2 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {results.map((result) => (
                <div key={result.id} className="p-1">
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {formatDisplayName(result)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.display_name}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDirectSelect(result)}
                        className="h-8 px-2"
                        title="Select this location"
                      >
                        <MapPinIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRadiusSelect(result)}
                        className="h-8 px-2"
                        title="Select radius around this location"
                      >
                        <RadiusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={radiusDialogOpen} onOpenChange={setRadiusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Radius</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="radius">Radius: {radius} km</Label>
              <Slider
                id="radius"
                min={0.5}
                max={50}
                step={0.5}
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                className="w-full"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This will select all postal codes within {radius}km of the selected location.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRadiusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRadiusConfirm}>
                Select {radius}km Radius
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
