# Layer System Architecture

## Overview

The application now supports **multiple persistent layers** (areas) where each layer has its own color and collection of postal codes. Users can switch between layers to edit them, and all changes are saved to the database.

## Core Concepts

### 1. **Layers (Areas)**

- Each layer is a separate entity with:
  - **Unique ID**: Database identifier
  - **Name**: User-defined name (editable via double-click)
  - **Color**: Visual color for rendering postal codes
  - **Opacity**: Transparency level (0-100)
  - **Visibility**: Whether the layer is shown on the map
  - **Postal Codes**: Collection of saved postal codes
  - **Order Index**: Display order

### 2. **Active Layer**

- Only ONE layer is "active" at a time
- The active layer is the one being edited
- Visual indicators:
  - **Thicker border** (2.5px vs 1.5px)
  - **Primary color border** in layer list
  - **Highlighted** in the UI
- All selection tools work with the active layer

### 3. **Selected Regions** (Temporary State)

- Postal codes selected but NOT yet saved to the layer
- Rendered with **30% opacity** in active layer's color
- Acts as a "preview" of what will be added
- Cleared after adding to or removing from layer

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Layer 1  │  │ Layer 2  │  │ Layer 3  │  ...             │
│  │ Blue     │  │ Red      │  │ Green    │                  │
│  │ [PLZ...] │  │ [PLZ...] │  │ [PLZ...] │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   fetchLayers()
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    MAP RENDERING                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Layer 1 postal codes → Rendered in blue             │   │
│  │  Layer 2 postal codes → Rendered in red              │   │
│  │  Layer 3 postal codes → Rendered in green            │   │
│  │  Selected regions → Rendered in active layer color   │   │
│  │                     (30% opacity preview)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↑
                   User Interaction
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  USER ACTIONS                                │
│  • Click postal codes → Add to selectedRegions              │
│  • Draw with tools → Add to selectedRegions                 │
│  • Click "Hinzufügen" → Save to active layer                │
│  • Click "Entfernen" → Remove from active layer             │
└─────────────────────────────────────────────────────────────┘
```

## Workflow

### Creating a New Layer

1. Enter layer name in "Neuer Layer..." input
2. Press Enter or click `+` button
3. Layer is created with auto-assigned color
4. **Automatically set as active layer**
5. Ready to add postal codes

### Selecting Postal Codes

1. **Select an active layer** by clicking on it
2. Use any selection tool:
   - **Cursor**: Click individual postal codes
   - **Lasso**: Free-hand drawing
   - **Circle**: Draw circles
   - **Polygon**: Click to draw polygons
   - **Rectangle**: Draw rectangles
3. Selected postal codes appear in "Ausgewählt" section
4. Preview overlay shows in active layer's color (30% opacity)

### Adding to Layer

1. Select postal codes (they appear in "Ausgewählt")
2. Click **"Hinzufügen"** button
3. Postal codes are saved to the database
4. Map updates immediately showing full opacity
5. Selected regions are cleared
6. Toast notification confirms action

### Removing from Layer

1. Select postal codes that are already in the active layer
2. Click **"Entfernen"** button
3. Postal codes are removed from database
4. Map updates immediately
5. Selected regions are cleared
6. Toast notification confirms action

### Editing Layers

- **Rename**: Double-click layer name, edit inline
- **Change Color**: Click color button, select from palette
- **Change Opacity**: Use slider
- **Toggle Visibility**: Click eye icon
- **Delete**: Click X button (with confirmation)

### Switching Between Layers

1. Click on any layer in the layer list
2. Layer becomes active (highlighted)
3. All subsequent selections work with this layer
4. Map shows preview in new active layer's color

## Rendering Logic

### Layer Postal Codes (Persistent Data)

```typescript
// Each layer's postal codes are rendered independently
layers.forEach((layer) => {
  const postalCodes = layer.postalCodes.map((pc) => pc.postalCode);
  const features = data.features.filter((f) =>
    postalCodes.includes(f.properties.code)
  );

  // Render with layer's color and opacity
  addLayer({
    fillColor: layer.color,
    fillOpacity: (layer.opacity / 100) * 0.6,
    visibility: layer.isVisible ? "visible" : "none",
  });
});
```

### Selected Regions (Temporary Preview)

```typescript
// Selected regions show as a preview overlay
const activeLayer = layers.find((l) => l.id === activeLayerId);
const selectedFeatures = data.features.filter((f) =>
  selectedRegions.includes(f.properties.code)
);

// Render with active layer's color but low opacity
addLayer({
  fillColor: activeLayer?.color || "#2563EB",
  fillOpacity: 0.3, // Preview opacity
  visibility: "visible",
});
```

## Key Components

### `DrawingTools` Component

- Manages layer list
- Handles layer CRUD operations
- Shows selected regions
- Provides Add/Remove buttons
- Displays active layer indicator

### `use-map-layers` Hook

- Renders all layers on the map
- Updates when layers change
- Handles selected regions overlay
- Manages layer visibility and colors

### `use-area-layers` Hook

- Fetches layers from database
- Creates/updates/deletes layers
- Adds/removes postal codes
- Manages layer state

## API Endpoints

### GET `/api/areas/[id]/layers`

- Returns all layers for an area
- Includes postal codes for each layer

### POST `/api/areas/[id]/layers`

- Creates a new layer
- Returns the created layer with ID

### PATCH `/api/areas/[id]/layers/[layerId]`

- Updates layer properties
- Can update postal codes array
- Returns updated layer

### DELETE `/api/areas/[id]/layers/[layerId]`

- Deletes layer and its postal codes
- Returns success confirmation

## Important Implementation Details

### No Auto-Sync

- Selected regions are NOT automatically added to layers
- User must explicitly click "Hinzufügen" to save
- This prevents accidental saves and gives user control

### Preview vs Persistent

- **30% opacity** = Preview (selected regions)
- **60% of layer opacity** = Saved data (layer postal codes)
- Visual distinction helps users understand state

### Duplicate Prevention

- Adding checks for existing postal codes
- Only adds new codes not already in layer
- Shows info toast if all codes already exist

### Data Persistence

- All layer changes immediately saved to database
- Map re-renders after every save
- No local-only state that could be lost

### Color Management

- 8 predefined colors cycle automatically
- Colors can be changed after creation
- Active layer color used for preview overlay

## Debugging

### Console Logs (Development Mode)

```javascript
// When layers update
[PostalCodesViewClientWithLayers] Layers updated: { count, layers... }

// When rendering layers
[useMapLayers] Rendering area layers: X
[useMapLayers] Layer Y (Name): { postalCodesCount, color, opacity... }
[useMapLayers] Layer Y matched Z/W features

// Warnings
[useMapLayers] No features found for layer X
```

### Common Issues

**Layers not rendering:**

- Check console for "matched 0/X features"
- Verify postal code format matches data (should be `code` property)
- Confirm layers array is not empty

**Selected regions wrong color:**

- Check if an active layer is selected
- Verify activeLayerId is set correctly

**Changes not saving:**

- Check network tab for failed API calls
- Verify database connection
- Check for error toasts

## Best Practices

1. **Always have an active layer** before selecting postal codes
2. **Use "Hinzufügen"** to confirm additions
3. **Double-check** before removing postal codes
4. **Toggle visibility** to see individual layers
5. **Use colors** to distinguish different areas/categories
6. **Name layers descriptively** for easy identification
