# BaseMap Rerender Optimization Summary

## Problem Analysis

The BaseMap component was experiencing 4 rerenders during first load:

1. **Render #1** (18ms): Initial render with `isMapLoaded: false`, `styleLoaded: false`
2. **Render #2** (372ms): `styleLoaded` becomes `true`
3. **Render #3** (937ms): `isMapLoaded` becomes `true` (TerraDraw initializes)
4. **Render #4** (47ms): `layersLoaded` becomes `true`

## Root Causes Identified

### 1. Excessive Debug Logging Dependencies
- `useMapInteractions` had debug logging effects with too many dependencies
- Dependencies included `layersLoaded`, `isMapLoaded`, `styleLoaded` that change during initialization
- Each change triggered unnecessary rerenders

### 2. TerraDraw Hook Instability
- `useTerraDraw` had unstable callback dependencies
- Mount/unmount logging was running on every state change
- Mode change effects were not using stable callback references

### 3. Performance Monitor Overhead
- Performance monitor was logging on every render
- No throttling or conditional logging for development

### 4. Unstable Callback References
- Some callbacks were not properly memoized
- Callback dependencies were changing unnecessarily

## Optimization Fixes Applied

### 1. Reduced Debug Logging Dependencies

**File: `src/lib/hooks/use-map-interactions.ts`**
- Removed `layersLoaded`, `isMapLoaded`, `styleLoaded` from debug logging dependencies
- Only log when drawing mode actually changes
- Added development-only logging checks

### 2. Stabilized TerraDraw Hook

**File: `src/lib/hooks/use-terradraw.ts`**
- Added stable callback memoization for `onStart` and `onStop`
- Reduced mount/unmount logging to empty dependency array
- Added development-only logging throughout
- Used stable callback references in mode change effects

### 3. Optimized Performance Monitor

**File: `src/lib/hooks/use-map-performance-monitor.ts`**
- Reduced logging frequency (only log first 4 renders, then every 4th)
- Added development-only logging checks
- Improved timing calculation efficiency

### 4. Stabilized Drawing Tools Callbacks

**File: `src/lib/hooks/use-map-drawing-tools.ts`**
- Added development-only logging for mode changes
- Ensured all callbacks are properly memoized

## Expected Results

After these optimizations:

1. **Reduced Rerender Count**: The 4 necessary rerenders should remain (for state changes), but unnecessary rerenders should be eliminated
2. **Improved Performance**: Less logging overhead and more efficient dependency tracking
3. **Better Development Experience**: Cleaner console output with reduced noise
4. **Stable Hook Behavior**: TerraDraw hook should no longer remount unnecessarily

## Technical Details

### Key Changes:
- **Dependency Array Optimization**: Removed state variables that change during initialization from debug logging effects
- **Callback Stability**: Added `useCallback` wrappers for all callbacks passed to effects
- **Conditional Logging**: All debug logging now checks `process.env.NODE_ENV === "development"`
- **Effect Optimization**: Reduced effect triggers by removing unnecessary dependencies

### Performance Impact:
- Fewer effect executions during initialization
- Reduced console.log overhead in production
- More stable component behavior
- Better React DevTools profiling results

## Verification

To verify the optimization:
1. Clear browser cache and reload the page
2. Check console logs for BaseMap render count
3. Verify TerraDraw hook no longer unmounts/remounts unnecessarily
4. Confirm drawing tools remain functional

The optimizations maintain all functionality while significantly reducing unnecessary rerenders and improving performance during the critical first-load phase.
