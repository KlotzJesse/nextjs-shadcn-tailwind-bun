# Map Language Configuration

The map is configured to display all city names and labels in German by default.

## How it works

1. **Style Enhancement**: The map style is modified during initialization to prioritize German names using multiple fallback patterns:

   - `name:de` (primary German name)
   - `name_de` (alternative format)
   - `name:deutsch` (full language name)
   - `name_DE` (uppercase variant)
   - `name:ger` / `name:deu` (ISO language codes)

2. **Dynamic Language Setting**: After the map loads, all symbol layers are updated to use German text fields.

3. **Automatic Updates**: Language settings are reapplied when the map style changes or reloads.

## Files involved

- `src/lib/utils/map-style-utils.ts` - Core language utilities
- `src/lib/hooks/use-map-language.ts` - Hook for automatic language setting
- `src/components/shared/base-map.tsx` - Integration point

## Changing the language

To change the default language from German to another language:

1. Update the language parameter in `base-map.tsx`:

   ```tsx
   useMapLanguage(map, isMapLoaded, "en"); // Change 'de' to desired language
   ```

2. Supported languages are defined in `SUPPORTED_LANGUAGES` constant in `map-style-utils.ts`.

## Manual language switching

You can also change the language dynamically using:

```tsx
import { setMapLanguage } from "@/lib/utils/map-style-utils";

// Change to English
setMapLanguage(mapRef.current, "en");
```
