# Map Interaction Hooks Architecture

This document describes the modularized hook architecture for the KRAUSS Territory Management map system, optimized for React 19, Next.js 15, and maximum performance.

## Overview

The map interaction system has been completely modularized into specialized hooks that handle different aspects of map functionality while maintaining maximum performance and minimal re-renders.

## Core Hooks

### 1. `useMapDrawingTools`
- **Purpose**: Manages drawing tools state and visibility
- **Responsibilities**: Drawing mode state, tools visibility toggle
- **Optimizations**: Memoized callbacks, stable state references
- **Location**: `/src/lib/hooks/use-map-drawing-tools.ts`

### 2. `useMapHoverInteraction`
- **Purpose**: Handles map hover interactions and visual feedback
- **Responsibilities**: Hover state tracking, cursor styling, hover source updates
- **Optimizations**: Ref-based state (no re-renders), memoized event handlers
- **Location**: `/src/lib/hooks/use-map-hover-interaction.ts`

### 3. `useMapClickInteraction`
- **Purpose**: Manages click-based feature selection
- **Responsibilities**: Feature selection/deselection, click event handling
- **Optimizations**: Stable callbacks, dependency optimization
- **Location**: `/src/lib/hooks/use-map-click-interaction.ts`

### 4. `useMapEventListeners`
- **Purpose**: Centralized event listener management
- **Responsibilities**: Mouse event attachment/detachment, cursor styling
- **Optimizations**: Proper cleanup, conditional attachment
- **Location**: `/src/lib/hooks/use-map-event-listeners.ts`

### 5. `useMapTerraDrawSelection`
- **Purpose**: Handles TerraDraw polygon/circle selections
- **Responsibilities**: Geometry processing, coordinate validation, feature finding
- **Optimizations**: Memoized calculations, ref-based API access
- **Location**: `/src/lib/hooks/use-map-terradraw-selection.ts`

### 6. `useMapInteractions`
- **Purpose**: Master hook that orchestrates all interactions
- **Responsibilities**: Combines all interaction hooks, provides unified API
- **Optimizations**: Memoized map reference, stable hook composition
- **Location**: `/src/lib/hooks/use-map-interactions.ts`

### 7. `useMapSelectedFeaturesSource`
- **Purpose**: Manages selected features source updates
- **Responsibilities**: MapLibre source data synchronization
- **Optimizations**: Effect-based updates only when necessary
- **Location**: `/src/lib/hooks/use-map-selected-features-source.ts`

## Performance & Optimization Hooks

### 8. `useMapOptimizations`
- **Purpose**: Memoizes expensive computations
- **Responsibilities**: Feature collections, label points, data extent calculations
- **Optimizations**: `useMemo` for heavy operations, stable getter functions
- **Location**: `/src/lib/hooks/use-map-optimizations.ts`

### 9. `useMapPerformanceMonitor`
- **Purpose**: Development-time performance monitoring
- **Responsibilities**: Render counting, timing analysis, re-render warnings
- **Optimizations**: Development-only execution, ref-based counters
- **Location**: `/src/lib/hooks/use-map-performance-monitor.ts`

### 10. `useMapBusinessLogic`
- **Purpose**: Centralized business rules and validation
- **Responsibilities**: Layer IDs, validation functions, business constraints
- **Optimizations**: Memoized validators, stable ID generation
- **Location**: `/src/lib/hooks/use-map-business-logic.ts`

## Architecture Benefits

### 🚀 Performance
- **Minimal Re-renders**: Ref-based state for non-UI affecting changes
- **Memoized Computations**: Heavy calculations cached with `useMemo`
- **Stable References**: Callbacks memoized with `useCallback`
- **Conditional Effects**: Effects only run when necessary

### 🧩 Modularity
- **Single Responsibility**: Each hook handles one concern
- **Composable**: Hooks can be used independently or together
- **Testable**: Each hook can be unit tested in isolation
- **Reusable**: Business logic can be shared across components

### 🛠 Maintainability
- **Clear Separation**: Drawing, hover, click, and selection logic separated
- **Type Safety**: Full TypeScript coverage with proper types
- **Documentation**: Each hook is self-documenting with clear interfaces
- **Error Handling**: Robust validation and error boundaries

### 📈 Scalability
- **Business Logic Centralization**: Rules and constraints in dedicated hooks
- **Performance Monitoring**: Built-in development-time optimization insights
- **Flexible Configuration**: Easy to add new drawing modes or interactions
- **Memory Efficient**: Proper cleanup and memory management

## Usage Pattern

```typescript
// In BaseMap component
export function BaseMap({ data, layerId, ... }: BaseMapProps) {
  // 1. Basic setup
  const { mapRef, isMapLoaded, styleLoaded } = useMapInitialization({...});
  const { selectedRegions, addSelectedRegion, ... } = useMapState();

  // 2. Performance optimizations
  const { getSelectedFeatureCollection, getLabelPoints, ... } = useMapOptimizations({...});
  const { layerIds, sourceIds, selectionStats, ... } = useMapBusinessLogic({...});

  // 3. Layer management
  const { layersLoaded } = useMapLayers({...});

  // 4. Comprehensive interactions
  const {
    currentDrawingMode,
    isDrawingToolsVisible,
    handleDrawingModeChange,
    clearAll,
    ...
  } = useMapInteractions({...});

  // 5. Source updates
  useMapSelectedFeaturesSource({...});

  // 6. Development monitoring
  useMapPerformanceMonitor({...});
}
```

## React 19 Optimizations

### Concurrent Features
- **Suspense Boundaries**: Loading states for async operations
- **Transition APIs**: Smooth state transitions for drawing mode changes
- **Memoization**: Extensive use of `useMemo` and `useCallback`

### Performance Patterns
- **Ref-based State**: Non-UI state stored in refs to prevent re-renders
- **Stable Dependencies**: Dependency arrays optimized for minimal changes
- **Conditional Hooks**: Smart conditional execution based on map state
- **Memory Management**: Proper cleanup in useEffect returns

## Enterprise-Grade Features

### Error Boundaries
- Graceful degradation when map operations fail
- Isolated error handling per interaction type
- User-friendly error messages

### Accessibility
- ARIA labels and roles for drawing tools
- Keyboard navigation support
- Screen reader compatibility

### Performance Monitoring
- Development-time render analysis
- Memory usage tracking
- Performance bottleneck identification

### Type Safety
- Full TypeScript coverage
- Strict type checking
- Runtime type validation for critical operations

## Migration Guide

### From Legacy Code
1. Replace inline state with `useMapDrawingTools()`
2. Move hover logic to `useMapHoverInteraction()`
3. Extract click handlers to `useMapClickInteraction()`
4. Use `useMapInteractions()` as the main orchestrator
5. Add performance monitoring with `useMapPerformanceMonitor()`

### Best Practices
- Always use the business logic hook for validation
- Leverage memoized computations from optimization hook
- Monitor performance during development
- Keep hook dependencies stable
- Use refs for non-UI state when possible

This architecture provides a solid foundation for building complex, performant map interactions while maintaining code quality and developer experience.
