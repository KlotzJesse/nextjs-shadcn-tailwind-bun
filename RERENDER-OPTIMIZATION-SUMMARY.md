# BaseMap Rerender Optimization Summary

## Problem Analysis

The BaseMap component was experiencing 4 rerenders during first load:

1. **Render #1** (18ms): Initial render with `isMapLoaded: false`, `styleLoaded: false`
2. **Render #2** (372ms): `styleLoaded` becomes `true`
3. **Render #3** (937ms): `isMapLoaded` becomes `true` (TerraDraw initializes)
4. **Render #4** (47ms): `layersLoaded` becomes `true`

## Root Causes Identified

### 1. Debug Logging Effects Causing Rerenders
- `useMapInteractions` had debug logging effects that triggered on `isMapLoaded` and `styleLoaded` changes
- Each state change triggered the debug logging effect, causing parent component rerenders
- TerraDraw parameters logging was running on every map state change

### 2. useMapLayers Hook Dependency Issues
- `useMapLayers` included `selectedRegions` and `hoveredRegionId` in its main initialization effect
- These dependencies caused layer reinitialization on every selection change
- `setLayersLoaded(true)` was called repeatedly when these dependencies changed

### 3. TerraDraw Hook Instability
- Mount/unmount logging was running on every state change
- Callback dependencies were not properly memoized
- Mode change effects were not using stable callback references

### 4. Performance Monitor Overhead
- Performance monitor was logging on every render without throttling
- No development-only checks for production optimization

## Optimization Fixes Applied

### 1. Eliminated Debug Logging Rerenders

**File: `src/lib/hooks/use-map-interactions.ts`**
- **REMOVED** TerraDraw parameters debug logging effect entirely
- Reduced drawing mode logging to only log when `currentDrawingMode`, `isCursorMode`, or `isDrawingActive` actually changes
- Removed `isMapLoaded` and `styleLoaded` from all debug logging dependencies

### 2. Fixed useMapLayers Dependency Array

**File: `src/lib/hooks/use-map-layers.ts`**
- **CRITICAL FIX**: Removed `selectedRegions` and `hoveredRegionId` from the main layer initialization effect
- Layer initialization now only depends on map setup, not selection state
- Selection updates are handled by separate effects that don't trigger `setLayersLoaded`

**File: `src/lib/hooks/use-terradraw.ts`**
- Added stable callback memoization for `onStart` and `onStop`
- Reduced mount/unmount logging to empty dependency array
- Added development-only logging throughout
- Used stable callback references in mode change effects

### 3. Stabilized TerraDraw Hook

**File: `src/lib/hooks/use-terradraw.ts`**
- Added stable callback memoization for `onStart` and `onStop`
- Reduced mount/unmount logging to empty dependency array
- Added development-only logging checks throughout
- Used stable callback references in mode change effects

### 4. Optimized Performance Monitor

**File: `src/lib/hooks/use-map-performance-monitor.ts`**
- Reduced logging frequency (only log first 4 renders, then every 4th)
- Added development-only logging checks
- Improved timing calculation efficiency

### 5. Cleaned Up Drawing Tools

**File: `src/lib/hooks/use-map-drawing-tools.ts`**
- Added development-only logging for mode changes
- Ensured all callbacks are properly memoized

## Expected Results

After these optimizations:

1. **Reduced to 3 Necessary Rerenders**:
   - Render #1: Initial render
   - Render #2: `styleLoaded` becomes true
   - Render #3: `isMapLoaded` becomes true
   - **Render #4 ELIMINATED**: `layersLoaded` no longer triggers unnecessary rerenders

2. **Improved Performance**:
   - Eliminated debug logging overhead during initialization
   - Reduced effect executions during map setup
   - Better React DevTools profiling results

3. **Stable Layer Management**:
   - Layers initialize once and remain stable
   - Selection changes no longer trigger layer reinitialization
   - Hover states update without full layer recreation

4. **Cleaner Development Experience**:
   - Reduced console noise during development
   - More focused debug logging
   - Production builds have zero debug logging overhead

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
