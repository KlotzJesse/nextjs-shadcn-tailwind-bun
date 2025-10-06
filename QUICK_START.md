# Quick Start Guide - Area Management System

## Prerequisites

- Database with PostGIS extension enabled
- Environment variable `DATABASE_URL` configured
- Bun runtime installed

## Installation Steps

### 1. Apply Database Migrations

Run the migration to create the new tables:

```bash
bunx drizzle-kit push
```

This will create:

- `areas` table
- `area_versions` table
- `area_layers` table
- `area_layer_postal_codes` table

### 2. Update Your Postal Codes Page

Replace the old client component with the new layer-enabled version:

**Before:**

```tsx
import PostalCodesViewClient from "@/components/postal-codes/postal-codes-view-client";
```

**After:**

```tsx
import PostalCodesViewClientWithLayers from "@/components/postal-codes/postal-codes-view-client-layers";
```

Then use it:

```tsx
<PostalCodesViewClientWithLayers
  initialData={data}
  statesData={statesData}
  defaultGranularity={granularity}
/>
```

### 3. Update App Sidebar (Optional)

If you want to pass the current area context to the sidebar:

```tsx
"use client";

import { useMapState } from "@/lib/url-state/map-state";

export default function Layout({ children }) {
  const { areaId, setArea } = useMapState();

  return (
    <SidebarProvider>
      <AppSidebar currentAreaId={areaId} onAreaSelect={(id) => setArea(id)} />
      {children}
    </SidebarProvider>
  );
}
```

## First Use

1. **Start the development server:**

   ```bash
   bun run dev
   ```

2. **Navigate to the postal codes page:**

   ```
   http://localhost:3000/postal-codes
   ```

3. **Create your first area:**

   - Look for "Gebiete" section in the sidebar
   - Click the "+" button
   - Enter a name (e.g., "Nord-Region")
   - Choose granularity (5-digit recommended)
   - Click "Erstellen"

4. **A default layer is created automatically:**

   - Named "Layer 1"
   - Blue color (#3b82f6)
   - 70% opacity

5. **Add postal codes to the layer:**

   - Use the address search
   - Use the postal code picker
   - Import from file
   - Use radius search

6. **Create additional layers:**

   - Type a name in the layer panel
   - Click the "+" button
   - Different color is automatically assigned

7. **Customize layers:**
   - Click the color palette icon to change color
   - Adjust opacity slider
   - Toggle visibility with eye icon
   - Click layer card to make it active

## Key Concepts

### Areas

Think of areas as **projects** or **planning scenarios**. Each area:

- Has a unique name and description
- Contains multiple layers
- Has its own granularity setting
- Can be archived when no longer needed

### Layers

Layers are **colored groups** of postal codes within an area:

- Different teams/regions can have different colors
- Layers can overlap (same postal code in multiple layers)
- Only the active layer receives new selections
- Invisible layers don't appear on the map but data is retained

### Auto-Save

- Changes are saved automatically after 2 seconds of inactivity
- No need to manually save
- Toast notifications confirm saves

## Common Workflows

### Scenario 1: Planning Multiple Sales Territories

```
Area: "Q1 2025 Sales Plan"
├── Layer 1: "Territory North" (Blue)
│   └── Postal codes: 10xxx, 20xxx, ...
├── Layer 2: "Territory South" (Red)
│   └── Postal codes: 80xxx, 90xxx, ...
└── Layer 3: "Disputed Areas" (Yellow)
    └── Postal codes: 50xxx, 60xxx, ...
```

### Scenario 2: Before/After Comparison

```
Area: "Service Area Redesign"
├── Layer 1: "Current Coverage" (Green)
│   └── Existing postal codes
└── Layer 2: "Proposed Coverage" (Orange)
    └── New postal codes
```

### Scenario 3: Risk Analysis

```
Area: "Market Analysis"
├── Layer 1: "High Priority" (Red, 80% opacity)
├── Layer 2: "Medium Priority" (Orange, 60% opacity)
└── Layer 3: "Low Priority" (Blue, 40% opacity)
```

## Troubleshooting

### "No area selected" message

- Click an area from the sidebar
- Or create a new area with the "+" button

### Postal codes not being added

- Ensure a layer is selected (blue border)
- Check that the layer is not at maximum capacity
- Verify postal codes match the area's granularity

### Auto-save not working

- Check browser console for errors
- Verify API routes are accessible
- Ensure database connection is active

### Layers not visible on map

- Check the eye icon - ensure layer is visible
- Verify opacity is > 0%
- Ensure postal codes have been added to the layer

## Next Steps

- Review the full documentation: `AREA_MANAGEMENT_GUIDE.md`
- Explore version history (coming soon)
- Set up export functionality
- Configure user permissions

## Support

For issues or questions:

1. Check the console for error messages
2. Review API responses in Network tab
3. Verify database schema matches migration
4. Check that all dependencies are installed
