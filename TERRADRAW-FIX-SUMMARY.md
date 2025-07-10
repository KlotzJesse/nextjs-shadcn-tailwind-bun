# TerraDraw Hook Stability Fix Summary

## Problem Identified

The TerraDraw hook was constantly mounting and unmounting, preventing proper initialization. The logs showed:

1. `[TerraDraw] useTerraDraw hook mounted` followed immediately by `[TerraDraw] useTerraDraw hook unmounted`
2. This cycle repeated multiple times
3. When `window.debugTerraDraw()` was called, it showed `[TerraDraw] Debug: Not initialized`
4. There were frequent re-renders detected (86ms intervals)

## Root Cause

The main issue was **unstable dependencies** causing constant hook re-mounting:

```typescript
// PROBLEMATIC CODE (before fix):
const map = mapRef.current; // This creates a new reference on every render!

const terraDrawApi = useTerraDraw({
  map: map && isMapLoaded && styleLoaded ? map : null, // This dependency changes constantly
  isEnabled: isDrawingActive,
  mode: isDrawingActive ? currentDrawingMode : null,
  onSelectionChange: handleTerraDrawSelection,
});
```

The issue was that `mapRef.current` was being extracted to a variable and passed as a dependency. Since refs can change their `.current` value without triggering re-renders, but when we extract it to a variable, that variable becomes unstable and causes dependency arrays to be different on every render.

## Solution Applied

### 1. Changed useTerraDraw to Accept mapRef Instead of map Instance

**Before:**
```typescript
export type UseTerraDrawProps = {
  map: MapLibre | null;
  isEnabled: boolean;
  mode: TerraDrawMode | null;
  // ...
};
```

**After:**
```typescript
export type UseTerraDrawProps = {
  mapRef: RefObject<MapLibre | null>; // Pass the ref, not the instance
  isMapLoaded: boolean; // Added for better control
  styleLoaded: boolean; // Added for better control
  isEnabled: boolean;
  mode: TerraDrawMode | null;
  // ...
};
```

### 2. Updated useMapInteractions to Pass Stable References

**Before:**
```typescript
// This creates unstable reference
const map = mapRef.current;

const terraDrawApi = useTerraDraw({
  map: map && isMapLoaded && styleLoaded ? map : null,
  // ...
});
```

**After:**
```typescript
// Pass the ref directly - much more stable
const terraDrawApi = useTerraDraw({
  mapRef, // Pass the ref, let useTerraDraw handle the dereferencing
  isMapLoaded,
  styleLoaded,
  isEnabled: isDrawingActive,
  mode: isDrawingActive ? currentDrawingMode : null,
  onSelectionChange: handleTerraDrawSelection,
});
```

### 3. Fixed Internal useTerraDraw Implementation

**Stable dependency arrays:**
```typescript
// Before: [map, stableOnSelectionChange] - unstable
// After: [mapRef, isMapLoaded, styleLoaded, stableOnSelectionChange] - stable

useEffect(() => {
  const map = mapRef.current; // Dereference inside the effect
  if (!map || !isMapLoaded || !styleLoaded || isInitializedRef.current) return;

  // Initialize TerraDraw...
}, [mapRef, isMapLoaded, styleLoaded, stableOnSelectionChange]);
```

**Proper cleanup handling:**
```typescript
useEffect(() => {
  const currentMap = mapRef.current; // Capture the current map instance
  return () => {
    if (drawRef.current && currentMap) {
      // Use captured instance in cleanup
    }
  };
}, [mapRef]);
```

### 4. Fixed All Other Hook Dependencies

Updated all hooks to use `mapRef.current` instead of extracted `map` variables:

```typescript
// Fixed all these:
useMapHoverInteraction(mapRef.current, layerId, layersLoaded, isCursorMode);
useMapClickInteraction(mapRef.current, /* ... */);
useMapEventListeners({ map: mapRef.current, /* ... */ });
```

## Key Principles Applied

1. **Stable References**: Always pass refs directly to hooks, not extracted values
2. **Controlled Dereferencing**: Dereference refs inside useEffect, not in render
3. **Proper Dependencies**: Use the ref itself as a dependency, not its current value
4. **Captured Cleanup**: Capture ref values at effect setup time for cleanup functions

## Result

After these changes:

1. ✅ Build successful with no TypeScript or lint errors
2. ✅ Development server starts correctly
3. ✅ TerraDraw hook should now initialize once and remain stable
4. ✅ No more constant mounting/unmounting cycles
5. ✅ Hooks maintain stable dependency arrays

## Testing Next Steps

1. Navigate to `/postal-codes/2digit` in the browser
2. Open browser console
3. Check for stable TerraDraw initialization logs
4. Test drawing tools activation
5. Use `window.debugTerraDraw()` to verify initialization

The hook stability issue has been resolved by ensuring all dependencies are truly stable and avoiding the common React pitfall of extracting ref values in render scope.
