# Migration to Layer-Based Postal Code Selections

## Overview

Completed migration from deprecated URL-based `selectedRegions` state to a fully layer-based postal code management system.

**Date:** October 6, 2025
**Impact:** Breaking change - all postal code selections now managed through database-persisted layers

## What Changed

### Before (Deprecated)

- Postal codes stored in URL query parameter `selectedRegions`
- Global selection state managed by `useMapState()`
- Multiple helper functions: `addSelectedRegion`, `removeSelectedRegion`, etc.
- Selections lost on page refresh if not in URL
- URL pollution with large postal code arrays

### After (Current)

- Postal codes stored in database per layer
- Each layer has its own set of postal codes
- Active layer concept for editing
- Persistent data across sessions
- Clean URLs with only `areaId` and `activeLayerId`

## Files Modified

### Core State Management

1. **`src/lib/url-state/map-state.ts`**
   - Removed `selectedRegions` state
   - Removed helper functions: `addSelectedRegion`, `removeSelectedRegion`, `clearSelectedRegions`, `setSelectedRegions`, `addSelectedRegions`
   - Removed `useSelectedRegions()` hook
   - Kept only `areaId` and `activeLayerId`

### Map Components

2. **`src/components/shared/base-map.tsx`**

   - Removed all `selectedRegions` references
   - Updated all hook calls to remove selectedRegions parameters

3. **`src/components/shared/drawing-tools.tsx`**
   - Refactored to work with active layer
   - Removed "Ausgewählt" section
   - Removed Add/Remove buttons (functionality moved to layer operations)
   - Updated export functions to use active layer's postal codes

### Map Hooks

4. **`src/lib/hooks/use-map-layers.ts`**

   - Removed `selectedRegions` prop from interface
   - Updated rendering logic to work with layer data only

5. **`src/lib/hooks/use-map-optimizations.ts`**

   - Removed `selectedRegions` parameter
   - Returns empty collections for compatibility
   - `selectedCount` now always 0

6. **`src/lib/hooks/use-map-interactions.ts`**

   - Removed `selectedRegions` and related parameters
   - Updated all sub-hook calls

7. **`src/lib/hooks/use-map-click-interaction.ts`**

   - Removed selection logic
   - Shows info toast directing users to use layers

8. **`src/lib/hooks/use-map-terradraw-selection.ts`**
   - Removed `selectedRegions` state management
   - Keeps only pending postal codes from drawings
   - Add/Remove now show info messages

### Postal Code Views

9. **`src/components/postal-codes/postal-codes-view-client.tsx`**

   - Removed `addSelectedRegions` usage
   - Shows info messages for radius searches
   - Guides users to create areas/layers

10. **`src/components/postal-codes/postal-codes-view-client-layers.tsx`**
    - Uses only layer operations
    - Shows warnings when no active layer selected
    - All operations require active layer

## New Workflow

### For Users

#### Old Way (Deprecated)

```
1. Click postal code region → Added to URL selection
2. Use drawing tools → Added to URL selection
3. Export → Exports selected regions
```

#### New Way (Current)

```
1. Create an Area (Gebiet)
2. Create a Layer in that Area
3. Set Layer as Active
4. Use drawing tools → Postal codes go to pending
5. Click "Hinzufügen" → Adds to active layer
6. Export → Exports active layer's postal codes
```

### For Developers

#### Old API

```typescript
const { selectedRegions, addSelectedRegion, setSelectedRegions } =
  useMapState();
```

#### New API

```typescript
// Get area and layer context
const { areaId, activeLayerId } = useMapState();

// Work with layers
const { layers, addPostalCodesToLayer, removePostalCodesFromLayer } =
  useAreaLayers(areaId);

// Add postal codes to active layer
await addPostalCodesToLayer(activeLayerId, postalCodes);
```

## Breaking Changes

### Removed Functions

- `addSelectedRegion(code: string)`
- `removeSelectedRegion(code: string)`
- `clearSelectedRegions()`
- `setSelectedRegions(codes: string[])`
- `addSelectedRegions(codes: string[])`
- `useSelectedRegions()`

### Removed Props/Parameters

- `selectedRegions` from all hooks
- `addSelectedRegion` from click handlers
- `setSelectedRegions` from drawing handlers

### Changed Behavior

- Clicking regions now shows info toast instead of selecting
- Drawing tools create pending postal codes only
- Radius searches require active layer
- Import operations require active layer
- Export uses active layer instead of selection

## Migration Guide

### If you have code using old API:

#### Before:

```typescript
// Selecting postal codes
addSelectedRegion("10115");
addSelectedRegions(["10115", "10117"]);

// Getting selections
const codes = selectedRegions;

// Exporting
const exportCodes = selectedRegions.map((code) => `D-${code}`);
```

#### After:

```typescript
// Ensure user has area and layer
const { areaId, activeLayerId } = useMapState();
const { addPostalCodesToLayer } = useAreaLayers(areaId);

// Adding postal codes
if (activeLayerId) {
  await addPostalCodesToLayer(activeLayerId, ["10115", "10117"]);
} else {
  toast.warning("Bitte wählen Sie einen aktiven Layer aus");
}

// Getting selections
const activeLayer = layers.find((l) => l.id === activeLayerId);
const codes = activeLayer?.postalCodes?.map((pc) => pc.postalCode) || [];

// Exporting
const exportCodes = codes.map((code) => `D-${code}`);
```

## Benefits

1. **Data Persistence** - Postal codes saved in database, not lost on refresh
2. **Multi-Layer Support** - Multiple sets of postal codes per area
3. **Clean URLs** - No more massive URL query parameters
4. **Better UX** - Users understand they're working with persistent layers
5. **Scalability** - Database can handle unlimited postal codes per layer
6. **Version Control** - Can track layer changes over time
7. **Sharing** - Share areas by ID, not by copying huge URLs

## Database Schema

### Tables

- `areaLayers` - Stores layer metadata (name, color, opacity, visibility)
- `areaLayerPostalCodes` - Stores postal codes per layer (many-to-many)

### Example Query

```sql
-- Get all postal codes for a layer
SELECT lpc.postalCode
FROM areaLayerPostalCodes lpc
WHERE lpc.layerId = 123
ORDER BY lpc.postalCode;
```

## Server Actions

New server actions for layer operations:

- `createLayerAction(areaId, data)` - Create new layer
- `updateLayerAction(areaId, layerId, data)` - Update layer
- `deleteLayerAction(areaId, layerId)` - Delete layer
- `addPostalCodesToLayerAction(areaId, layerId, codes)` - Add codes
- `removePostalCodesFromLayerAction(areaId, layerId, codes)` - Remove codes

## Testing Checklist

- [x] Remove selectedRegions from URL state
- [x] Update all map hooks
- [x] Update base map component
- [x] Update drawing tools
- [x] Update postal codes views
- [x] Update click interactions
- [x] Update drawing interactions
- [x] Create server actions
- [x] Test layer creation
- [x] Test postal code addition
- [x] Test postal code removal
- [x] Test export functionality
- [x] Test import functionality
- [x] No TypeScript errors
- [x] No runtime errors

## Known Issues / Limitations

1. **Radius searches** in non-layer view show info message only
2. **Click selection** disabled - shows info to use layers
3. **Pending postal codes** must be manually added to layer
4. **No global selection** - must use layers for all operations

## Future Enhancements

- [ ] Bulk layer operations
- [ ] Layer templates
- [ ] Layer merging UI
- [ ] Layer comparison view
- [ ] Import from old URL selections
- [ ] Layer sharing/export

## Rollback Plan

If rollback needed:

1. Revert all commits related to this migration
2. Re-enable `selectedRegions` in map-state.ts
3. Restore old hook signatures
4. Database layer data remains intact

## Support

For questions or issues:

- Check LAYER_SYSTEM_ARCHITECTURE.md for system details
- Review this migration guide
- Check git history for specific changes
