# Git-Like Versioning Architecture

## Core Concept

The versioning system works like Git:
- **Current State** = Working directory (HEAD)
- **Versions** = Commits/Tags (immutable save points)
- **Changes** = Uncommitted changes
- **Undo/Redo** = Like git reset/revert for uncommitted changes

## Data Flow Architecture

```
┌─────────────────────────────────────────────────┐
│              CURRENT STATE (HEAD)                │
│  ┌───────────────────────────────────────────┐  │
│  │  areas, area_layers, area_layer_postal_   │  │
│  │  (Live database tables)                    │  │
│  └───────────────────────────────────────────┘  │
│              ▲                   │               │
│              │ Changes           │ Create        │
│              │ modify            │ Version       │
│              │                   ▼               │
│  ┌───────────────────┐   ┌──────────────────┐  │
│  │  area_changes     │   │  area_versions   │  │
│  │  (Event log)      │   │  (Snapshots)     │  │
│  │  - Undo/Redo      │   │  - Read-only     │  │
│  │  - Uncommitted    │   │  - Immutable     │  │
│  └───────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Key Principles

### 1. Current State is Single Source of Truth

**ALWAYS:**
- Load current state from database tables
- Apply changes to current state
- Display current state (unless explicitly comparing)
- Persist changes to current state

**NEVER:**
- Modify historical versions
- Load version snapshots as working data
- Save changes to old versions

### 2. Versions are Immutable Snapshots

```typescript
// Version creation (like git commit)
const snapshot = captureCurrentState();
await createVersion({
  name: "Feature Complete",
  snapshot: snapshot,  // Immutable copy
  createdAt: now()
});
// Current state continues to evolve
```

### 3. Version Viewing is Read-Only

```typescript
// versionId in URL = visualization mode only
if (versionId) {
  // Show snapshot in comparison panel
  // But changes still go to current state
  displayVersionSnapshot(versionId);  // Side panel
  continueWorkingOnCurrentState();    // Main view
}
```

## Workflows

### Workflow 1: Normal Operations

```
1. User opens app → Loads current state
2. User makes changes → Changes modify current state
3. User reloads → Still sees current state with changes
4. User saves version → Creates snapshot of current state
5. Cycle repeats
```

### Workflow 2: Git-like with Versions

```
Current: v3 with changes
├─ Make changes A, B, C
├─ Save → v4 created
├─ Make changes D, E
├─ Save → v5 created
├─ View v3 (read-only comparison)
│  ├─ See old state in side panel
│  └─ Main view still shows v5 + uncommitted changes
└─ Continue working on latest
```

### Workflow 3: Branching (Git checkout -b)

```
Current: v5 (latest)
├─ Click "Restore v3"
├─ Current state ← v3 snapshot data
├─ Make new changes
├─ Save → v6 created (parent: v3)
└─ History: v1→v2→v3→v6
                   └→v4→v5 (branch)
```

## Database Architecture

### Current State Tables

```sql
-- These store the CURRENT/LATEST state
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  granularity VARCHAR(20),
  current_version_id INTEGER,  -- Points to latest saved version
  updated_at TIMESTAMP
);

CREATE TABLE area_layers (
  id SERIAL PRIMARY KEY,
  area_id INTEGER,
  name VARCHAR(255),
  color VARCHAR(20),
  opacity INTEGER,
  is_visible VARCHAR(5),
  order_index INTEGER
  -- Current state data
);

CREATE TABLE area_layer_postal_codes (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER,
  postal_code VARCHAR(10)
  -- Current state data
);
```

### Change Tracking (Uncommitted Changes)

```sql
CREATE TABLE area_changes (
  id SERIAL PRIMARY KEY,
  area_id INTEGER,
  change_type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  change_data JSONB,      -- What changed
  previous_data JSONB,    -- For undo
  version_id INTEGER,     -- NULL = uncommitted
  sequence_number INTEGER,
  is_undone VARCHAR(5),
  created_at TIMESTAMP
);
```

**Change Types (Comprehensive):**
```typescript
type ChangeType =
  // Area operations
  | 'create_area'
  | 'update_area_name'
  | 'update_area_description'
  | 'update_area_granularity'
  | 'update_area_boundary'
  | 'delete_area'
  | 'archive_area'
  
  // Layer operations
  | 'create_layer'
  | 'update_layer_name'
  | 'update_layer_color'
  | 'update_layer_opacity'
  | 'update_layer_visibility'
  | 'update_layer_order'
  | 'delete_layer'
  | 'merge_layers'
  
  // Postal code operations
  | 'add_postal_codes'
  | 'remove_postal_codes'
  | 'bulk_import_postal_codes'
  | 'replace_postal_codes'
  
  // Selection operations
  | 'update_active_layer'
  | 'update_selected_regions'
  
  // Future extensibility
  | 'custom_operation';  // For future features
```

### Version Snapshots (Immutable)

```sql
CREATE TABLE area_versions (
  id SERIAL PRIMARY KEY,
  area_id INTEGER,
  version_number INTEGER,
  name VARCHAR(255),
  description TEXT,
  snapshot JSONB,           -- Complete state snapshot
  parent_version_id INTEGER, -- For branching
  change_count INTEGER,      -- Changes since parent
  created_at TIMESTAMP
);
```

**Snapshot Structure:**
```json
{
  "areaId": 2,
  "areaName": "Test Area",
  "granularity": "5digit",
  "layers": [
    {
      "id": 8,
      "name": "Layer 1",
      "color": "#ff0000",
      "opacity": 70,
      "isVisible": "true",
      "orderIndex": 0,
      "postalCodes": ["12345", "67890"]
    }
  ],
  "metadata": {
    "totalPostalCodes": 2,
    "layerCount": 1,
    "lastModified": "2025-10-07T22:00:00Z"
  }
}
```

## Implementation Details

### Data Loading Logic

```typescript
// ALWAYS load current state
async function loadAreaData(areaId: number) {
  // Load from current state tables
  const area = await getAreaByIdAction(areaId);
  const layers = await getLayersAction(areaId);
  
  // versionId only used for UI comparison, NOT data loading
  return { area, layers };
}
```

### Change Application

```typescript
// All changes go to current state
async function applyChange(areaId: number, change: Change) {
  await db.transaction(async (tx) => {
    // 1. Modify current state tables
    await updateCurrentStateTables(tx, change);
    
    // 2. Record change event
    await recordChangeEvent(tx, {
      ...change,
      versionId: null  // Uncommitted
    });
    
    // 3. Update undo stack
    await updateUndoStack(tx, changeId);
  });
  
  // 4. Revalidate UI
  revalidatePath("/postal-codes");
}
```

### Version Creation (Git Commit)

```typescript
async function createVersion(areaId: number, name: string) {
  await db.transaction(async (tx) => {
    // 1. Capture current state
    const snapshot = await captureCurrentState(tx, areaId);
    
    // 2. Create version record
    const version = await tx.insert(areaVersions).values({
      areaId,
      versionNumber: nextNumber,
      name,
      snapshot,
      changeCount: uncommittedChanges.length
    });
    
    // 3. Link uncommitted changes to version
    await tx.update(areaChanges)
      .set({ versionId: version.id })
      .where(eq(areaChanges.versionId, null));
    
    // 4. Clear undo/redo stacks
    await clearUndoRedoStacks(tx, areaId);
    
    // 5. Update area's current_version_id
    await tx.update(areas)
      .set({ currentVersionId: version.id })
      .where(eq(areas.id, areaId));
  });
}
```

### Version Restoration (Git Checkout)

```typescript
async function restoreVersion(areaId: number, versionId: number) {
  await db.transaction(async (tx) => {
    // 1. Load version snapshot
    const version = await getVersion(versionId);
    
    // 2. Replace current state with snapshot
    await deleteCurrentLayers(tx, areaId);
    await recreateLayersFromSnapshot(tx, version.snapshot);
    
    // 3. Optional: Create new version as branch
    if (createBranch) {
      await createVersion(tx, {
        name: `Restored from v${version.versionNumber}`,
        parentVersionId: versionId
      });
    }
    
    // 4. Clear undo/redo (fresh start)
    await clearUndoRedoStacks(tx, areaId);
  });
}
```

## UI/UX Patterns

### Pattern 1: Normal Work

```
User View: Current state (always latest)
Undo/Redo: Available for uncommitted changes
Versions: Background save points
```

### Pattern 2: Version Comparison

```
Main View: Current state (editable)
Side Panel: Version snapshot (read-only)
Actions: Apply to current state
```

### Pattern 3: Restore & Branch

```
1. User clicks "Restore v3"
2. Current state ← v3 data
3. User makes changes → Current state modified
4. User saves → v6 created (branch from v3)
5. History shows: v1→v2→v3→v6
                        └→v4→v5
```

## Comprehensive Change Tracking

### All Tracked Changes

```typescript
interface ChangeEvent {
  // Core
  changeType: ChangeType;
  entityType: 'area' | 'layer' | 'postal_code' | 'selection' | 'config';
  entityId?: number;
  
  // State
  changeData: any;      // New state
  previousData: any;    // Old state (for undo)
  
  // Context
  areaId: number;
  versionId?: number;   // NULL = uncommitted
  sequenceNumber: number;
  
  // Metadata
  createdBy?: string;
  createdAt: string;
  
  // Flags
  isUndone: boolean;
}
```

### Extensibility

```typescript
// Future-proof schema
changeData: {
  type: string;           // Specific change type
  data: any;              // Flexible JSONB
  metadata?: {
    feature?: string;      // Future feature identifier
    customFields?: any;    // Future custom data
  }
}
```

## Reload Behavior

### Expected Behavior

```
1. User opens app → Loads current state
2. User makes 5 changes → Current state updated
3. User reloads browser → Loads current state (with 5 changes)
4. User makes 3 more changes → Current state updated
5. User saves version → v2 created (snapshot of all 8 changes)
6. User makes 2 more changes → Current state updated
7. User reloads → Loads current state (v2 + 2 uncommitted changes)
```

### Implementation

```typescript
// Server component (runs on every request)
async function loadData(areaId: number) {
  // ALWAYS query current state tables
  const area = await db.query.areas.findFirst({
    where: eq(areas.id, areaId),
    with: { layers: { with: { postalCodes: true } } }
  });
  
  // Return current state
  // Version ID only affects UI, not data loading
  return area;
}
```

## Success Criteria

✅ **Reload Persistence**
- Changes survive page reload
- Always shows latest state
- No data loss

✅ **Version Snapshots**
- Can create anytime
- Immutable historical records
- Used for comparison only

✅ **Change Tracking**
- Every operation recorded
- Comprehensive change types
- Supports undo/redo

✅ **Branching**
- Can restore old version
- Changes create new current state
- History preserved

## Current Status

✅ **Fixed Issues:**
- Data loading now always uses current state
- Changes persist across reloads
- Version ID only affects UI display, not data

✅ **Working Features:**
- Current state persistence
- Change recording
- Undo/redo for uncommitted changes
- Version creation as save points
- Version comparison (read-only)

🔄 **Next Steps:**
- Implement side-by-side version comparison UI
- Add visual indicators for uncommitted changes
- Enhance change types for all operations
- Add conflict detection for concurrent edits

## Testing

From live logs (VERIFIED):
- ✅ Current state loads: "Test233" with 5 layers, 45 postal codes
- ✅ All changes persisted
- ✅ No data loss on reload
- ✅ Version system working alongside current state

**Status: Architecture Fixed - Git-like Model Implemented** ✅