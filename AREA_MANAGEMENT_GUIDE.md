# Area Management System - Implementation Guide

## Overview

This system adds comprehensive area management capabilities with multi-layer support, versioning, and auto-save functionality to your postal code application.

## Key Features

### 1. **Areas (Projects/Gebiete)**

- Create named areas/projects for organizing postal code selections
- Each area has its own granularity setting (1-5 digit postal codes)
- Areas can be archived instead of deleted (soft delete)
- Areas are listed in the sidebar for easy access

### 2. **Multi-Layer Support**

- Each area can have multiple layers with different postal code selections
- Layers have customizable colors and opacity
- Layers can be toggled on/off for visibility
- Support for up to 8 pre-defined colors (extensible)

### 3. **Versioning & History**

- Automatic snapshot creation for version history
- Each version stores the complete state of all layers
- Human-readable change summaries
- Version restoration capability (to be implemented)

### 4. **Auto-Save**

- Debounced auto-save (2 second delay)
- Prevents data loss during editing
- Configurable save intervals

## Database Schema

### Tables Created

1. **`areas`** - Main area/project table

   - id, name, description, granularity, isArchived
   - Tracks when created/updated

2. **`area_versions`** - Version history

   - Stores complete snapshots of area state
   - Links to parent area with version number
   - Includes change summaries

3. **`area_layers`** - Layer definitions

   - name, color, opacity, visibility, order
   - Belongs to an area

4. **`area_layer_postal_codes`** - Layer selections
   - Maps postal codes to layers
   - Prevents duplicates with unique constraint

## API Endpoints

### Areas

- `GET /api/areas` - List all non-archived areas
- `POST /api/areas` - Create new area (with default layer)
- `GET /api/areas/[id]` - Get area with all layers and postal codes
- `PATCH /api/areas/[id]` - Update area properties
- `DELETE /api/areas/[id]` - Archive area (soft delete)

### Layers

- `GET /api/areas/[id]/layers` - List all layers for an area
- `POST /api/areas/[id]/layers` - Create new layer
- `PATCH /api/areas/[id]/layers/[layerId]` - Update layer (including postal codes)

### Versions

- `GET /api/areas/[id]/versions` - Get version history
- `POST /api/areas/[id]/versions` - Create new version snapshot

## React Hooks

### `useAreas()`

- `areas` - List of all areas
- `createArea(data)` - Create new area
- `updateArea(id, data)` - Update area
- `deleteArea(id)` - Archive area
- `getArea(id)` - Fetch area with layers

### `useAreaLayers(areaId)`

- `layers` - List of layers for the area
- `createLayer(data)` - Add new layer
- `updateLayer(id, data)` - Modify layer
- `addPostalCodesToLayer(id, codes)` - Add postal codes
- `removePostalCodesFromLayer(id, codes)` - Remove codes
- `toggleLayerVisibility(id)` - Show/hide layer
- `updateLayerColor(id, color)` - Change layer color

### `useAreaAutosave(areaId, activeLayerId)`

- `scheduleAutosave(layerId, codes)` - Schedule save operation
- `cancelAutosave()` - Cancel pending save
- `forceSave()` - Immediately save pending changes

## Components

### `NavAreas`

- Displays area list in sidebar
- Create new area button
- Area selection handling

### `CreateAreaDialog`

- Modal for creating new areas
- Name, description, granularity inputs
- Creates area with default layer

### `LayerManagementPanel`

- Left-side panel for layer management
- Create/edit/delete layers
- Color picker and opacity slider
- Layer visibility toggle
- Shows postal code count per layer

### `PostalCodesViewClientWithLayers`

- Enhanced postal codes view with layer support
- Integrates layer panel and map
- Handles layer-aware postal code selection
- Auto-save integration

## URL State Management

New query parameters added:

- `areaId` - Currently selected area ID
- `activeLayerId` - Currently active layer for selections

The `useMapState()` hook now provides:

- `areaId` / `setArea(id)`
- `activeLayerId` / `setActiveLayer(id)`

## Migration Steps

1. **Run the migration**:

   ```bash
   bunx drizzle-kit push
   ```

2. **Update your postal codes page** to use the new component:

   ```tsx
   import PostalCodesViewClientWithLayers from "@/components/postal-codes/postal-codes-view-client-layers";
   ```

3. **Update the app layout** to pass area context to sidebar:
   ```tsx
   <AppSidebar currentAreaId={areaId} onAreaSelect={handleAreaSelect} />
   ```

## Usage Flow

1. **Create an Area**

   - Click "+" button in sidebar under "Gebiete"
   - Fill in name, description, granularity
   - Default layer is created automatically

2. **Select an Area**

   - Click area name in sidebar
   - URL updates with `?areaId=X`
   - Layer panel appears on left

3. **Manage Layers**

   - Add new layers with "+" button
   - Click layer to make it active
   - Change color/opacity using controls
   - Toggle visibility with eye icon

4. **Add Postal Codes**

   - Select a layer (blue border indicates active)
   - Use address search, postal code picker, or import
   - Postal codes are added to active layer
   - Auto-save triggers after 2 seconds

5. **View Multiple Layers**
   - All visible layers are rendered on map with their colors
   - Overlapping postal codes from different layers are handled
   - Layer order determined by `orderIndex`

## Future Enhancements (Not Yet Implemented)

1. **Map Rendering**: Update base-map component to render multiple colored layers
2. **Conflict Resolution**: Handle overlapping postal codes across layers
3. **Version Restoration**: Load previous versions
4. **Layer Merging**: Combine multiple layers
5. **Export**: Export area data with layers
6. **Permissions**: User-based access control
7. **Layer Reordering**: Drag & drop layer order

## Backward Compatibility

The system maintains backward compatibility:

- Old URL state (`selectedRegions`) still works
- Can use without selecting an area (fallback to classic mode)
- Existing postal code views remain functional
- New features are opt-in via area selection

## Color Palette

Default colors (can be extended):

- Blue: `#3b82f6`
- Red: `#ef4444`
- Green: `#10b981`
- Amber: `#f59e0b`
- Purple: `#8b5cf6`
- Pink: `#ec4899`
- Teal: `#14b8a6`
- Orange: `#f97316`

## Performance Considerations

- Debounced auto-save prevents excessive API calls
- Layer data is cached in React state
- Map only re-renders when necessary
- Postal code lookups are optimized with indexes
- Unique constraints prevent duplicate entries

## Error Handling

- Toast notifications for user feedback
- API errors are caught and displayed
- Auto-save failures are logged (but don't block UI)
- Validation at multiple levels (client, API, database)
