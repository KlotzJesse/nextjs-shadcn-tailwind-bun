# 🎨 Multi-Layer Area Management - User Guide

Welcome to the comprehensive multi-layer postal code area management system! This guide will walk you through all the new features.

## 🚀 Quick Start

### Creating Your First Area

1. Open the application at http://localhost:3000
2. Click the sidebar (hamburger menu icon)
3. Find the "Gebiete" section
4. Click **"Neues Gebiet"** button
5. Enter:
   - **Name**: e.g., "Norddeutschland Vertriebsgebiet"
   - **Description**: e.g., "Vertriebsregion für Norddeutschland mit PLZ-Bereichen"
   - **Granularity**: Select "postal_codes" for postal code level
6. Click **"Erstellen"**

### Adding Postal Codes to Layers

1. Select your area from the sidebar
2. On the left side, you'll see the **Layer Management Panel**
3. The default layer "Main Layer" is automatically created
4. Use the map tools to:
   - **Select Mode**: Click individual postal codes
   - **Polygon Mode**: Draw custom shapes
   - **Circle Mode**: Select by radius
   - **Lasso Mode**: Free-hand selection
5. Selected postal codes are automatically saved to the active layer (auto-save every 2 seconds)

## 🎨 Working with Multiple Layers

### Creating Additional Layers

1. In the Layer Panel, type a layer name (e.g., "Premium Bereich")
2. Click the **+ button**
3. The new layer gets assigned a color from the palette:
   - Blue, Red, Green, Amber, Purple, Pink, Teal, Orange
4. Select the new layer by clicking on it (highlights with border)
5. Add postal codes using map tools - they'll be added to the active layer

### Customizing Layer Appearance

Each layer has individual controls:

#### **Color Picker** 🎨

- Click the color button with palette icon
- Select from 8 predefined colors
- Map updates immediately

#### **Opacity Slider** 🔆

- Drag the slider (0-100%)
- Affects how transparent the layer appears on the map
- Useful for seeing overlapping areas

#### **Visibility Toggle** 👁️

- Click the eye icon to hide/show layer
- Hidden layers remain in database but don't render on map
- Great for comparing different scenarios

### Understanding Layer States

- **Active Layer**: Has primary-colored border in panel
  - Receives new postal code selections
  - Shows thicker border (2.5px) on map
- **Visible Layer**: Eye icon is open
  - Renders on map with its color
  - Border opacity 70%
- **Hidden Layer**: Eye icon is closed
  - Doesn't render on map
  - Data preserved in database

## 🔀 Advanced Features

### 1. Conflict Resolution

Conflicts occur when the same postal code exists in multiple layers.

**Opening Conflict Dialog:**

1. Click **"Konflikte"** button in layer panel
2. System scans all layers for duplicates

**Resolving Conflicts:**

1. Select conflicting postal codes (checkboxes)
2. Choose resolution strategy:
   - **"Behalten in: [Layer Name]"** - Keep in specific layer, remove from others
   - **"Aus allen Layern entfernen"** - Remove from all layers completely
3. Click **"X Konflikte auflösen"**
4. Click **"Neu scannen"** to verify resolution

**Conflict Display:**

- Each postal code shows colored badges for layers containing it
- Total conflict count shown in amber warning badge

### 2. Version History

Version snapshots preserve the exact state of all layers at a point in time.

**Creating a Version:**

1. Click **"Snapshot"** button in layer panel
2. Enter optional metadata:
   - **Name**: e.g., "Vor Q1 Expansion"
   - **Description**: Detailed notes
   - **Changes Summary**: What changed since last version
3. Click **"Version erstellen"**

**Viewing Version History:**

1. Click **"Historie"** button
2. See all versions with:
   - Version number (auto-incremented)
   - Timestamp (relative: "vor 2 Stunden")
   - Layer count and total postal codes
   - User who created it (if tracked)
3. Click a version to expand layer details

**Restoring a Version:**

1. Open version history
2. Click desired version to select it
3. Review layer composition in expanded view
4. Click **"Version X wiederherstellen"**
5. Page reloads with restored data
6. ⚠️ **Warning**: Current state is replaced (create snapshot first!)

### 3. Layer Merging

Combine multiple layers using different strategies.

**Merging Layers:**

1. Click **"Merge"** button in layer panel
2. Select **at least 2 layers** (checkboxes)
3. Choose **target layer** (keeps its name and color)
4. Select **merge strategy**:

**Merge Strategies:**

#### **Vereinigung (Union)** - Recommended for most cases

- Combines all postal codes from all selected layers
- Removes duplicates automatically
- Source layers are deleted
- Target layer contains union of all postal codes
- **Example**: Layer A (100 PLZ) + Layer B (120 PLZ) → Layer A (200 PLZ)

#### **Ziel behalten (Keep Target)**

- Keeps only target layer's postal codes
- Ignores source layers' postal codes
- Effectively just deletes source layers
- **Example**: Layer A (100 PLZ) + Layer B (120 PLZ) → Layer A (100 PLZ)

#### **Beide behalten (Keep Source)**

- Keeps target as-is, adds all source postal codes
- May create duplicates within layer
- Useful for comprehensive coverage
- **Example**: Layer A (100 PLZ) + Layer B (120 PLZ) → Layer A (220 PLZ, with possible duplicates)

**Live Preview:**

- Shows target count, source count, and result count
- Helps verify expected outcome before merging

**After Merging:**

- Source layers are automatically deleted
- Target layer is updated
- Layer list refreshes automatically

### 4. Auto-Save

**How it works:**

- Monitors changes to layer postal codes
- Debounces saves by 2 seconds (prevents excessive API calls)
- Saves automatically when you stop making changes
- No "Save" button needed!

**Visual Feedback:**

- Layer panel shows postal code count in real-time
- Map updates immediately
- Database sync happens in background

## 🗺️ Understanding Map Rendering

### Visual Hierarchy (bottom to top):

1. **Base postal codes** - Light gray fill, dashed borders
2. **Area layers** - Your custom colored layers
3. **Selected regions** - Primary blue highlight
4. **Hover** - Lightest blue when mouse over
5. **Labels** - Postal code text on top

### Layer Rendering Features:

- **Color**: Each layer has distinct hex color (#3b82f6, #ef4444, etc.)
- **Opacity**: Controlled by slider, affects only fill (not border)
- **Border Width**: Active layer = 2.5px, others = 1.5px
- **Border Opacity**: Active = 90%, others = 70%
- **Visibility**: Toggle on/off without losing data

### Map Interaction:

- Click postal code → Adds to **active layer**
- Shift+Click → Removes from active layer
- Drawing tools → Select multiple at once
- All changes auto-save to database

## 💡 Best Practices

### Organizing Areas

1. **Use descriptive names**: "Q1 2025 Sales Territory North" vs "Area 1"
2. **Add descriptions**: Include criteria, date created, purpose
3. **Create versions before major changes**: Easy to revert if needed
4. **Use consistent color scheme**: Assign meaning to colors (red=priority, blue=standard)

### Working with Layers

1. **Start with base layer**: Select common postal codes first
2. **Create specialized layers**: Split into regions/categories
3. **Name layers clearly**: "Hamburg City", "Rural Areas", "Premium Zones"
4. **Use visibility toggle**: Compare different layer combinations
5. **Adjust opacity**: See through layers to find overlaps

### Version Control Workflow

1. **Before imports**: Create snapshot before bulk postal code imports
2. **After discussions**: Snapshot decisions from planning meetings
3. **Quarterly**: Create versions at regular intervals
4. **Before merge**: Snapshot both layers before merging
5. **Name versioning**: Use dates or milestones ("2025-01-15 Pre-Merge")

### Performance Tips

1. **Hide unused layers**: Improves map rendering speed
2. **Merge similar layers**: Reduce total layer count
3. **Use conflict resolution**: Keep data clean and unique
4. **Delete old versions**: Archive if not needed (coming soon)

## 🔍 Troubleshooting

### Postal codes not appearing on map?

1. Check layer visibility (eye icon)
2. Verify opacity > 0%
3. Confirm postal codes were added to active layer
4. Check map zoom level (zoom in more)

### Changes not saving?

1. Wait 2 seconds for auto-save debounce
2. Check browser console for errors
3. Verify database connection
4. Try manual page refresh

### Conflicts keep appearing?

1. Use conflict resolution dialog
2. Select all conflicts
3. Choose one layer to keep them in
4. Click "Neu scannen" to verify
5. Consider merging layers if conflicts persist

### Version restore not working?

1. Ensure you selected a version (click to highlight)
2. Check that "Version X wiederherstellen" button is enabled
3. Allow page reload to complete
4. Check browser console for API errors

## 🎯 Common Workflows

### Scenario 1: Creating Sales Territories

1. Create area: "Sales Territories 2025"
2. Create layers: "Territory North", "Territory South", "Territory West"
3. Select postal codes for each territory
4. Use different colors (blue, red, green)
5. Create version: "Initial Territory Split"
6. Share link with team for review

### Scenario 2: Comparing Old vs New Regions

1. Create area: "Region Comparison"
2. Layer 1: "Current Regions" (import existing data)
3. Create version: "Current State"
4. Layer 2: "Proposed Regions" (add new postal codes)
5. Toggle visibility to compare
6. Use merge to finalize decision

### Scenario 3: Handling Overlapping Delivery Areas

1. Create area: "Delivery Zones"
2. Import multiple CSV files to separate layers
3. Click "Konflikte" to find overlaps
4. Review conflicting postal codes
5. Decide priority (keep in primary delivery layer)
6. Resolve all conflicts
7. Create version: "Conflicts Resolved"

## 📊 Data Export (Coming Soon)

- Export area with all layers as JSON
- Download individual layers as CSV
- GeoJSON export for GIS systems
- PDF reports with layer statistics

## 🤝 Collaboration Features (Planned)

- Share areas with team members
- Track who created each version
- Comments on versions
- Layer permissions
- Change notifications

## 📱 Keyboard Shortcuts

- `Ctrl/Cmd + Click` - Multi-select postal codes
- `Shift + Click` - Remove from selection
- `Esc` - Cancel drawing mode
- `Delete` - Clear selected regions (with confirmation)

## 🎓 Learning Resources

- [AREA_MANAGEMENT_GUIDE.md](./AREA_MANAGEMENT_GUIDE.md) - Technical documentation
- [QUICK_START.md](./QUICK_START.md) - Developer setup guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Feature implementation details

---

**Need Help?**

- Check browser console for error messages
- Review database migration logs
- Contact your administrator
- Open an issue on GitHub

**Version**: 1.0.0
**Last Updated**: January 2025
**Compatible with**: Next.js 15.4.2, React 19, MapLibre GL 5.6.1
