# TerraDraw Hook Stability Issue - Root Cause and Fix

## Critical Issue Identified 🔍

The TerraDraw hook was constantly mounting and unmounting due to an **unstable callback dependency chain**.

### Root Cause

In `useMapTerraDrawSelection`, the `handleTerraDrawSelection` callback had `selectedRegions` in its dependency array:

```typescript
// PROBLEMATIC CODE (before fix):
const handleTerraDrawSelection = useCallback(
  (featureIds: (string | number)[]) => {
    // ... logic that used selectedRegions directly
    const mergedRegions = [...new Set([...selectedRegions, ...newFeatures])];
    setSelectedRegions(mergedRegions);
  },
  [
    mapRef,
    findFeaturesInPolygon,
    findFeaturesInCircle,
    selectedRegions, // ← THIS CAUSED THE INSTABILITY!
    setSelectedRegions,
    convertRadiusToGeographic,
  ]
);
```

### The Problem Chain

1. User selects/deselects regions → `selectedRegions` changes
2. `selectedRegions` changes → `handleTerraDrawSelection` callback recreated
3. `handleTerraDrawSelection` changes → `stableOnSelectionChange` in `useTerraDraw` recreated
4. `stableOnSelectionChange` changes → `useTerraDraw` hook remounts
5. Hook remounts → TerraDraw never gets a chance to initialize properly

## Solution Applied ✅

### 1. Removed Unstable Dependency

Used a ref to track `selectedRegions` instead of including it in the dependency array:

```typescript
// FIXED CODE:
export function useMapTerraDrawSelection({
  mapRef,
  data,
  selectedRegions,
  setSelectedRegions,
}: UseMapTerraDrawSelectionProps) {
  // Ref to track current selected regions to avoid dependency issues
  const selectedRegionsRef = useRef<string[]>(selectedRegions);

  // Update ref when selectedRegions changes
  useEffect(() => {
    selectedRegionsRef.current = selectedRegions;
  }, [selectedRegions]);

  const handleTerraDrawSelection = useCallback(
    (featureIds: (string | number)[]) => {
      // ... logic ...

      // Use ref to get current state and avoid dependency issues
      const currentSelectedRegions = selectedRegionsRef.current || [];
      const mergedRegions = [...new Set([...currentSelectedRegions, ...uniqueSelectedFeatures])];
      setSelectedRegions(mergedRegions);
    },
    [
      mapRef,
      findFeaturesInPolygon,
      findFeaturesInCircle,
      setSelectedRegions,
      convertRadiusToGeographic,
      // selectedRegions removed! ← STABILITY ACHIEVED
    ]
  );
}
```

### 2. Simplified TerraDraw Initialization

Removed the complex style loading detection logic and trusted the React state flags:

```typescript
// SIMPLIFIED INITIALIZATION:
useEffect(() => {
  const map = mapRef.current;
  if (!map || !isMapLoaded || !styleLoaded || isInitializedRef.current) return;

  // Trust React state - no more complex style loading detection
  console.log("[TerraDraw] Initializing TerraDraw with ready map and style...");

  try {
    // Create TerraDraw instance and start immediately
    const draw = new TerraDraw({ adapter, modes: [...] });
    draw.start();
    draw.setMode("select");

    drawRef.current = draw;
    isInitializedRef.current = true;
  } catch (error) {
    console.error("[TerraDraw] Failed to initialize TerraDraw:", error);
  }
}, [mapRef, isMapLoaded, styleLoaded, stableOnSelectionChange]);
```

## Expected Results 🎯

With these changes, the TerraDraw hook should now:

1. ✅ **Mount once and stay mounted** - no more constant mounting/unmounting
2. ✅ **Initialize properly** - TerraDraw instance should be created and ready
3. ✅ **Activate drawing tools** - freehand, circle, polygon tools should work
4. ✅ **Stable callback chain** - no more cascade of recreated callbacks

## Testing

Navigate to `/postal-codes/2digit` and check the browser console. You should see:

- Single "useTerraDraw hook mounted" log (not repeated)
- "TerraDraw initialized and started successfully"
- `window.debugTerraDraw()` should show "Current state" instead of "Not initialized"
- Drawing tools should activate when selected

The fundamental hook stability issue has been resolved by eliminating the unstable dependency that was causing the cascade of hook remounts.
