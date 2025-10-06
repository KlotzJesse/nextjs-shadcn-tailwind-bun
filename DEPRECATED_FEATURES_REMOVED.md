# Deprecated Features Removal - Drawing Tools Refactor

## Date: October 6, 2025

### Summary
Removed all deprecated URL state management features from `drawing-tools.tsx`, keeping only **Areas** and **Layers** functionality. The component now focuses exclusively on layer-based postal code management within areas.

---

## ✅ Removed Features

### 1. **URL State Management (`useMapState` hook)**
- Removed dependency on `useMapState` from `@/lib/url-state/map-state`
- Eliminated `selectedRegions` state stored in URL
- Removed `setSelectedRegions` function calls
- No longer manages selection state via URL parameters

### 2. **Export Functionality**
- **CSV Export**: Removed `handleCopyCSV()` function and Copy button
- **Excel Export**: Removed `handleExportExcel()` function and XLS button  
- **Dependencies**: Removed imports for:
  - `copyPostalCodesCSV` from `@/lib/utils/export-utils`
  - `exportPostalCodesXLSX` from `@/lib/utils/export-utils`

### 3. **Geoprocessing / Fill Regions**
- Removed entire `fillRegions()` async function
- Removed "Löcher füllen" (Fill Holes) button
- Removed `/api/geoprocess` endpoint calls
- Removed `isFilling` state variable
- Removed GeoJSON type imports:
  - `FeatureCollection`
  - `Polygon`
  - `MultiPolygon`
  - `GeoJsonProperties`

### 4. **Pending Postal Codes**
- Removed `pendingPostalCodes` prop from interface
- Removed `onAddPending` callback prop
- Removed `onRemovePending` callback prop
- Removed "Gefunden" (Found) section from UI
- Removed add/remove buttons for pending codes

### 5. **Selected Regions Section**
- Removed entire "Regionen" (Regions) collapsible section
- Removed `regionsOpen` state variable  
- Removed display of selected regions count
- Removed Add/Remove to Layer buttons
- Removed `handleAddToLayer()` function
- Removed `handleRemoveFromLayer()` function
- Removed active layer indicator in regions section

### 6. **Actions Section**
- Removed "Aktionen" collapsible section
- Removed "Deselektieren" (Deselect) button
- Removed `actionsOpen` state variable
- Kept only simplified "Zeichnung löschen" (Delete Drawing) button

### 7. **Unused Icon Imports**
- Removed from `lucide-react`:
  - `Copy`
  - `Diamond` (was used for fill holes)
  - `EyeOff` (was used for deselect)
  - `FileSpreadsheet` (was used for Excel export)
  - `Loader2Icon` (was used for fill loading state)

### 8. **Props Cleanup**
Removed from `DrawingToolsProps` interface:
```typescript
postalCodesData?: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
pendingPostalCodes?: string[];
onAddPending?: () => void;
onRemovePending?: () => void;
```

---

## ✅ Retained Features

### Core Functionality
1. **Layer Management**
   - Create, rename, delete layers
   - Layer visibility toggle
   - Color and opacity controls
   - Layer order management
   - Postal code count display per layer

2. **Drawing Tools**
   - Cursor (selection mode)
   - Lasso (freehand)
   - Circle
   - Polygon
   - Rectangle
   - Angled Rectangle
   - Granularity selector (PLZ 1-5)

3. **Layer Actions**
   - Conflicts dialog
   - Version history dialog
   - Create snapshot dialog
   - Layer merge dialog

4. **Area Integration**
   - `areaId` prop for area context
   - `activeLayerId` for active layer selection
   - `onLayerSelect` callback for layer activation

---

## 📊 Impact

### File Size Reduction
- **Before**: ~1065 lines
- **After**: ~645 lines
- **Reduction**: ~420 lines (-39%)

### Dependencies Removed
- `useMapState` hook (URL state management)
- Export utilities (CSV/XLSX)
- GeoJSON type definitions

### State Simplified
**Removed State Variables:**
- `selectedRegions`
- `setSelectedRegions`
- `regionsOpen`
- `actionsOpen`
- `isFilling`

**Retained State Variables:**
- `toolsOpen`
- `layersOpen`
- `newLayerName`
- `isCreating`
- `editingLayerId`
- `editingLayerName`
- `showConflicts`
- `showVersionHistory`
- `showCreateVersion`
- `showLayerMerge`

---

## 🎯 New Architecture

### Simplified Component Structure
```
DrawingTools
├── Layer Management Section (areaId required)
│   ├── Layer action buttons (4)
│   ├── Create layer input
│   └── Layer list
│       ├── Layer item (click to activate)
│       ├── Color/opacity controls
│       └── Visibility/delete buttons
├── Drawing Tools Section
│   ├── Granularity selector
│   └── Tool grid (6 tools)
├── Clear Drawing Button (conditional)
└── Layer Dialogs (4)
```

### Data Flow
```
User Action → Layer Hook → Database → Rerender
                ↓
        Toast Notification
```

No more URL state synchronization or client-side selection management.

---

## 🔄 Migration Notes

### For Components Using DrawingTools

**Before:**
```typescript
<DrawingTools
  postalCodesData={data}
  pendingPostalCodes={pending}
  onAddPending={handleAdd}
  onRemovePending={handleRemove}
  // ...other props
/>
```

**After:**
```typescript
<DrawingTools
  areaId={areaId}
  activeLayerId={activeLayerId}
  onLayerSelect={setActiveLayerId}
  // ...other props (mode, granularity, etc.)
/>
```

### Breaking Changes
- Components can no longer pass `postalCodesData`
- No pending postal codes handling
- No CSV/Excel export from this component
- Selected regions no longer managed by this component
- Fill regions (geoprocessing) no longer available

---

## ✨ Benefits

1. **Cleaner Architecture**: Single responsibility - layer management only
2. **Better Performance**: No URL state synchronization overhead
3. **Simpler State**: 40% less code, easier to maintain
4. **Type Safety**: Removed complex GeoJSON type dependencies
5. **Focus**: Clear separation between drawing tools and data export
6. **Server-First Ready**: Prepared for server actions migration

---

## 🚀 Next Steps

1. **Server Actions Migration**: Convert layer hooks to server actions
2. **Export Feature**: Create separate export component if needed
3. **Geoprocessing**: Move to dedicated server-side API if needed
4. **Testing**: Update tests to match new props interface

---

## 📝 Notes

- All layer functionality remains intact
- Drawing tools continue to work as before
- Layer dialogs (conflicts, history, merge, snapshots) unchanged
- Component still supports granularity selection for drawing
- Clear drawing button still available when drawing mode is active

