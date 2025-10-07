# Versioning System Architecture

## Overview

This document provides a comprehensive technical overview of the real-time versioning and change tracking system implemented for the Next.js 15 map-based area management application.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Event Sourcing Pattern](#event-sourcing-pattern)
4. [Data Flow](#data-flow)
5. [Component Architecture](#component-architecture)
6. [Server Actions](#server-actions)
7. [Performance Optimizations](#performance-optimizations)
8. [Concurrency & Conflict Resolution](#concurrency--conflict-resolution)
9. [Usage Patterns](#usage-patterns)
10. [API Reference](#api-reference)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ UI Components│  │  React Hooks  │  │  Client State   │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘  │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server Actions Layer                    │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │Change Track  │  │Version Mgmt   │  │Layer Operations │  │
│  │Actions       │  │Actions        │  │Actions          │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘  │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database Layer                         │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │area_changes  │  │area_versions  │  │area_layers      │  │
│  │(Event Log)   │  │(Snapshots)    │  │(Current State)  │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
│  ┌──────────────┐                                            │
│  │undo_stacks   │                                            │
│  │(Undo/Redo)   │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Event Sourcing**: Every change is recorded as an immutable event
2. **Server-First**: All mutations occur through server actions
3. **Atomic Transactions**: Database consistency guaranteed
4. **Optimistic UI**: Fast user experience with background persistence
5. **Type Safety**: End-to-end TypeScript type checking

---

## Database Schema

### Core Tables

#### `areas`
Main area entities with versioning support.

```sql
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  granularity VARCHAR(20) NOT NULL DEFAULT '5digit',
  is_archived VARCHAR(5) NOT NULL DEFAULT 'false',
  current_version_id INTEGER,  -- FK to area_versions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_areas_current_version ON areas(current_version_id);
```

#### `area_versions`
Version snapshots with branching support.

```sql
CREATE TABLE area_versions (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  snapshot JSONB NOT NULL,  -- Full state snapshot
  changes_summary TEXT,
  parent_version_id INTEGER,  -- For branching
  branch_name VARCHAR(255),
  is_active VARCHAR(5) NOT NULL DEFAULT 'false',
  change_count INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(area_id, version_number)
);

CREATE INDEX idx_area_versions_area_id ON area_versions(area_id);
CREATE INDEX idx_area_versions_parent ON area_versions(parent_version_id);
CREATE INDEX idx_area_versions_is_active ON area_versions(area_id, is_active);
```

**Snapshot Structure:**
```typescript
{
  areaName: string;
  description: string;
  granularity: string;
  layers: Array<{
    id: number;
    name: string;
    color: string;
    opacity: number;
    isVisible: string;
    orderIndex: number;
    postalCodes: string[];
  }>;
}
```

#### `area_changes`
Event log for all changes (Event Sourcing).

```sql
CREATE TABLE area_changes (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL,  -- create_layer, update_layer, etc.
  entity_type VARCHAR(50) NOT NULL,  -- area, layer, postal_code
  entity_id INTEGER,
  change_data JSONB NOT NULL,        -- New state
  previous_data JSONB,               -- Previous state for undo
  version_id INTEGER,                -- FK to area_versions
  sequence_number INTEGER NOT NULL,  -- Order of changes
  is_undone VARCHAR(5) NOT NULL DEFAULT 'false',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_area_changes_area_id ON area_changes(area_id);
CREATE INDEX idx_area_changes_version_id ON area_changes(version_id);
CREATE INDEX idx_area_changes_sequence ON area_changes(area_id, sequence_number);
CREATE INDEX idx_area_changes_entity ON area_changes(entity_type, entity_id);
```

**Change Types:**
- `create_layer`: New layer created
- `update_layer`: Layer properties modified
- `delete_layer`: Layer removed
- `add_postal_codes`: Postal codes added to layer
- `remove_postal_codes`: Postal codes removed from layer
- `update_area`: Area properties modified

#### `area_undo_stacks`
Undo/redo stack management per area.

```sql
CREATE TABLE area_undo_stacks (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL UNIQUE,
  undo_stack JSONB NOT NULL DEFAULT '[]',  -- Array of change IDs
  redo_stack JSONB NOT NULL DEFAULT '[]',  -- Array of change IDs
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_area_undo_stacks_area_id ON area_undo_stacks(area_id);
```

#### `area_layers`
Current state of layers.

```sql
CREATE TABLE area_layers (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  opacity INTEGER NOT NULL DEFAULT 70,
  is_visible VARCHAR(5) NOT NULL DEFAULT 'true',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_area_layers_area_id ON area_layers(area_id);
CREATE INDEX idx_area_layers_order ON area_layers(area_id, order_index);
```

#### `area_layer_postal_codes`
Many-to-many relationship between layers and postal codes.

```sql
CREATE TABLE area_layer_postal_codes (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(layer_id, postal_code)
);

CREATE INDEX idx_area_layer_postal_codes_layer_id ON area_layer_postal_codes(layer_id);
CREATE INDEX idx_area_layer_postal_codes_postal_code ON area_layer_postal_codes(postal_code);
```

---

## Event Sourcing Pattern

### Concept

Instead of only storing current state, we store every change as an event. This enables:
- Complete audit trail
- Time travel (view any past state)
- Undo/redo functionality
- Branch from any point in history

### Event Flow

```
User Action → Server Action → Event Recording → State Update → Stack Update
                                      │
                                      ▼
                           area_changes table
                                      │
                                      ▼
                           ┌──────────┴──────────┐
                           │                     │
                           ▼                     ▼
                    Undo Stack             Version Count
                    Updated                Incremented
```

### Event Structure

```typescript
interface ChangeEvent {
  id: number;
  areaId: number;
  changeType: ChangeType;
  entityType: EntityType;
  entityId?: number;
  changeData: any;        // Forward state
  previousData?: any;     // Backward state (for undo)
  versionId?: number;
  sequenceNumber: number;
  isUndone: boolean;
  createdBy?: string;
  createdAt: string;
}

type ChangeType = 
  | 'create_layer'
  | 'update_layer'
  | 'delete_layer'
  | 'add_postal_codes'
  | 'remove_postal_codes'
  | 'update_area';

type EntityType = 'area' | 'layer' | 'postal_code';
```

---

## Data Flow

### Change Recording Flow

```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Server Action    │
│ (e.g., create    │
│  layer)          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Database         │
│ Transaction:     │
│ 1. Apply change  │
│ 2. Record event  │
│ 3. Update stack  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Revalidate Path  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ UI Auto-Updates  │
└──────────────────┘
```

### Undo Flow

```
┌─────────────┐
│ User Undo   │
│ (Ctrl+Z)    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Get Last Change  │
│ from Undo Stack  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Apply Reverse    │
│ Operation        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Move Change from │
│ Undo → Redo      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Mark as Undone   │
└──────────────────┘
```

### Version Creation Flow

```
┌─────────────┐
│ Create      │
│ Version     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Capture Current  │
│ State Snapshot   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Create Version   │
│ Record with:     │
│ - Snapshot       │
│ - Parent ID      │
│ - Change Count   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Link Uncommitted │
│ Changes to       │
│ Version          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Clear Undo/Redo  │
│ Stacks           │
└──────────────────┘
```

### Version Restore with Branching Flow

```
┌─────────────┐
│ Select Old  │
│ Version     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Load Snapshot    │
│ from Version     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Delete Current   │
│ Layers           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Recreate Layers  │
│ from Snapshot    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Create New       │
│ Version as       │
│ Branch           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Set Parent       │
│ Version ID       │
└──────────────────┘
```

---

## Component Architecture

### Component Hierarchy

```
App
└── PostalCodesView
    ├── MapComponent
    │   └── Layers (rendered)
    ├── LayerManagementPanel
    │   ├── LayerList
    │   └── LayerControls
    ├── UndoRedoToolbar
    │   ├── UndoButton
    │   └── RedoButton
    └── VersionHistoryDialog
        ├── VersionsList
        ├── ChangesHistory
        └── VersionComparison
```

### Client Components (Minimal Usage)

Only components requiring interactivity are client components:

1. **`UndoRedoToolbar`** (`"use client"`)
   - Handles keyboard shortcuts
   - Manages undo/redo state
   - Calls server actions

2. **`EnhancedVersionHistoryDialog`** (`"use client"`)
   - Interactive dialogs
   - Tabs and scrolling
   - Calls server actions

3. **`ChangePreviewDialog`** (`"use client"`)
   - Displays change preview
   - Confirmation dialogs

4. **Map Components** (`"use client"`)
   - MapLibre GL interactions
   - Drawing tools
   - Selection handling

### Server Components (Default)

All other components are server components:
- `PostalCodesView`
- `LayerManagementServer`
- `NavAreasServer`

---

## Server Actions

### Change Tracking Actions

Located in `src/app/actions/change-tracking-actions.ts`

#### `recordChangeAction(areaId, change)`
Records a change in the event log.

```typescript
await recordChangeAction(areaId, {
  changeType: "create_layer",
  entityType: "layer",
  entityId: layerId,
  changeData: { layer: { ...layerData } },
  createdBy: "user@example.com"
});
```

#### `undoChangeAction(areaId)`
Undoes the last change.

```typescript
const result = await undoChangeAction(areaId);
// Returns: { success: true, data: { changeId: number } }
```

#### `redoChangeAction(areaId)`
Redoes the last undone change.

```typescript
const result = await redoChangeAction(areaId);
```

#### `getChangeHistoryAction(areaId, options)`
Fetches change history.

```typescript
const result = await getChangeHistoryAction(areaId, {
  versionId: 5,           // Optional: filter by version
  limit: 50,              // Optional: limit results
  includeUndone: false    // Optional: include undone changes
});
```

#### `getUndoRedoStatusAction(areaId)`
Gets current undo/redo state.

```typescript
const result = await getUndoRedoStatusAction(areaId);
// Returns: { canUndo, canRedo, undoCount, redoCount }
```

#### `clearUndoRedoStacksAction(areaId)`
Clears undo/redo stacks.

```typescript
await clearUndoRedoStacksAction(areaId);
```

### Version Management Actions

Located in `src/app/actions/version-actions.ts`

#### `createVersionAction(areaId, data)`
Creates a new version snapshot.

```typescript
const result = await createVersionAction(areaId, {
  name: "Sprint 1 Complete",
  description: "All postal codes added",
  changesSummary: "Added 150 postal codes across 5 layers",
  createdBy: "user@example.com",
  branchName: "feature-branch",  // Optional
  fromVersionId: 3                // Optional: for branching
});
```

#### `autoSaveVersionAction(areaId, createdBy)`
Auto-saves current state.

```typescript
await autoSaveVersionAction(areaId, "user@example.com");
```

#### `getVersionsAction(areaId)`
Fetches all versions.

```typescript
const result = await getVersionsAction(areaId);
```

#### `restoreVersionAction(areaId, versionId, options)`
Restores a version.

```typescript
await restoreVersionAction(areaId, versionId, {
  createBranch: true,
  branchName: "Restored from v3",
  createdBy: "user@example.com"
});
```

#### `compareVersionsAction(versionId1, versionId2)`
Compares two versions.

```typescript
const result = await compareVersionsAction(v1Id, v2Id);
// Returns: {
//   layersAdded: [],
//   layersRemoved: [],
//   layersModified: [],
//   postalCodesAdded: [],
//   postalCodesRemoved: []
// }
```

#### `deleteVersionAction(versionId)`
Deletes a version.

```typescript
await deleteVersionAction(versionId);
```

---

## Performance Optimizations

### Database Level

1. **Indexes**
   - All foreign keys indexed
   - Composite indexes for common queries
   - Sequence numbers for fast ordering

2. **JSONB Storage**
   - Flexible schema for snapshots
   - Efficient storage and querying
   - GIN indexes for JSONB fields

3. **Query Optimization**
   - Pagination support
   - Selective field loading
   - Eager loading with relations

### Application Level

1. **Server Actions**
   - Atomic transactions
   - Batch operations
   - Revalidation on change

2. **Caching Strategy**
   ```typescript
   // Version snapshots are immutable - cache aggressively
   // Change history - cache with TTL
   // Undo/redo status - real-time, no cache
   ```

3. **Lazy Loading**
   - Version comparison on-demand
   - Change history pagination
   - Postal code details lazy loaded

### UI Level

1. **Optimistic Updates**
   ```typescript
   // Update UI immediately
   // Revert on error
   ```

2. **Debouncing**
   ```typescript
   // Auto-save: debounce 5 minutes
   // Search: debounce 300ms
   ```

3. **Virtual Scrolling**
   - Large version lists
   - Change history
   - Postal code lists

---

## Concurrency & Conflict Resolution

### Locking Strategy

**Optimistic Locking**: No explicit locks, detect conflicts at save time.

```typescript
// Check version before update
const currentVersion = await getArea(areaId);
if (currentVersion.updatedAt !== expectedUpdatedAt) {
  throw new ConflictError("Area was modified");
}
```

### Conflict Detection

```typescript
interface Conflict {
  type: 'version' | 'layer' | 'postal_code';
  local: any;
  remote: any;
  timestamp: string;
}
```

### Resolution Strategies

1. **Last Write Wins** (default)
   - Latest change takes precedence
   - Previous version preserved in history

2. **Manual Merge**
   - User resolves conflicts
   - ConflictResolutionDialog component

3. **Automatic Merge** (future)
   - Non-overlapping changes auto-merged
   - Conflicts flagged for review

---

## Usage Patterns

### Basic Undo/Redo

```typescript
// In your component
import { UndoRedoToolbar } from "@/components/areas/undo-redo-toolbar";

function MyComponent({ areaId }) {
  return <UndoRedoToolbar areaId={areaId} variant="floating" />;
}

// Keyboard shortcuts work automatically:
// Ctrl+Z / Cmd+Z: Undo
// Ctrl+Shift+Z / Ctrl+Y / Cmd+Shift+Z / Cmd+Y: Redo
```

### Creating Versions

```typescript
// Manual version
await createVersionAction(areaId, {
  name: "Milestone 1",
  description: "First draft complete"
});

// Auto-save
useEffect(() => {
  const interval = setInterval(() => {
    autoSaveVersionAction(areaId);
  }, 5 * 60 * 1000); // Every 5 minutes
  return () => clearInterval(interval);
}, [areaId]);
```

### Version History

```typescript
import { EnhancedVersionHistoryDialog } from "@/components/areas/enhanced-version-history-dialog";

function MyComponent({ areaId }) {
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowHistory(true)}>
        Version History
      </Button>
      <EnhancedVersionHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        areaId={areaId}
      />
    </>
  );
}
```

### Branching Workflow

```typescript
// 1. View version history
const versions = await getVersionsAction(areaId);

// 2. Select version to branch from
const oldVersion = versions.find(v => v.versionNumber === 3);

// 3. Restore and create branch
await restoreVersionAction(areaId, oldVersion.id, {
  createBranch: true,
  branchName: "Experiment A",
  createdBy: currentUser.email
});

// 4. Make changes on branch
await updateLayerAction(areaId, layerId, { color: "#ff0000" });

// 5. Create version on branch
await createVersionAction(areaId, {
  name: "Experiment A - Version 1",
  branchName: "Experiment A"
});
```

---

## API Reference

### Complete Server Action Signatures

```typescript
// Change Tracking
function recordChangeAction(
  areaId: number,
  change: ChangeRecord
): Promise<ServerActionResponse<{ changeId: number }>>;

function undoChangeAction(
  areaId: number
): Promise<ServerActionResponse<{ changeId: number }>>;

function redoChangeAction(
  areaId: number
): Promise<ServerActionResponse<{ changeId: number }>>;

function getChangeHistoryAction(
  areaId: number,
  options?: {
    versionId?: number;
    limit?: number;
    includeUndone?: boolean;
  }
): Promise<ServerActionResponse<Change[]>>;

function getUndoRedoStatusAction(
  areaId: number
): Promise<ServerActionResponse<UndoRedoStatus>>;

function clearUndoRedoStacksAction(
  areaId: number
): Promise<ServerActionResponse>;

// Version Management
function createVersionAction(
  areaId: number,
  data: VersionCreateData
): Promise<ServerActionResponse<{ versionId: number; versionNumber: number }>>;

function autoSaveVersionAction(
  areaId: number,
  createdBy?: string
): Promise<ServerActionResponse<{ versionId: number }>>;

function getVersionsAction(
  areaId: number
): Promise<ServerActionResponse<Version[]>>;

function getVersionAction(
  versionId: number
): Promise<ServerActionResponse<Version>>;

function restoreVersionAction(
  areaId: number,
  versionId: number,
  options?: RestoreOptions
): Promise<ServerActionResponse<{ newVersionId?: number }>>;

function deleteVersionAction(
  versionId: number
): Promise<ServerActionResponse>;

function compareVersionsAction(
  versionId1: number,
  versionId2: number
): Promise<ServerActionResponse<VersionComparison>>;

// Layer Operations (with change tracking)
function createLayerAction(
  areaId: number,
  data: LayerCreateData,
  createdBy?: string
): Promise<ServerActionResponse<{ id: number }>>;

function updateLayerAction(
  areaId: number,
  layerId: number,
  data: LayerUpdateData,
  createdBy?: string
): Promise<ServerActionResponse>;

function deleteLayerAction(
  areaId: number,
  layerId: number,
  createdBy?: string
): Promise<ServerActionResponse>;

function addPostalCodesToLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[],
  createdBy?: string
): Promise<ServerActionResponse>;

function removePostalCodesFromLayerAction(
  areaId: number,
  layerId: number,
  postalCodes: string[],
  createdBy?: string
): Promise<ServerActionResponse>;
```

### Type Definitions

```typescript
interface ServerActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ChangeRecord {
  changeType: ChangeType;
  entityType: EntityType;
  entityId?: number;
  changeData: any;
  previousData?: any;
  createdBy?: string;
}

interface UndoRedoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

interface Version {
  id: number;
  areaId: number;
  versionNumber: number;
  name: string | null;
  description: string | null;
  snapshot: VersionSnapshot;
  changesSummary: string | null;
  parentVersionId: number | null;
  branchName: string | null;
  isActive: string;
  changeCount: number;
  createdBy: string | null;
  createdAt: string;
}

interface VersionSnapshot {
  areaName: string;
  description: string;
  granularity: string;
  layers: LayerSnapshot[];
}

interface LayerSnapshot {
  id: number;
  name: string;
  color: string;
  opacity: number;
  isVisible: string;
  orderIndex: number;
  postalCodes: string[];
}

interface VersionComparison {
  layersAdded: LayerSnapshot[];
  layersRemoved: LayerSnapshot[];
  layersModified: LayerSnapshot[];
  postalCodesAdded: string[];
  postalCodesRemoved: string[];
}

interface RestoreOptions {
  createBranch?: boolean;
  branchName?: string;
  createdBy?: string;
}
```

---

## Best Practices

### 1. Version Creation

- Create versions at logical milestones
- Use descriptive names and descriptions
- Don't create versions for every change
- Use auto-save for safety

### 2. Change Recording

- Always record changes through server actions
- Include `createdBy` for audit trail
- Use descriptive change types
- Store both forward and backward state

### 3. Undo/Redo

- Clear stacks after version creation
- Don't allow undo of committed versions
- Provide preview before undo/redo
- Handle errors gracefully

### 4. Branching

- Use branches for experiments
- Name branches descriptively
- Document branch purpose
- Merge or clean up old branches

### 5. Performance

- Paginate large result sets
- Use indexes effectively
- Cache immutable data
- Lazy load details

---

## Troubleshooting

### Common Issues

1. **Undo stack empty after version**
   - This is expected behavior
   - Versions commit changes
   - Start fresh undo stack

2. **Version restore slow**
   - Large snapshots take time
   - Consider archiving old versions
   - Use indexes effectively

3. **Concurrent modifications**
   - Implement conflict resolution
   - Use optimistic locking
   - Provide merge UI

4. **Database performance**
   - Monitor query performance
   - Archive old changes
   - Optimize indexes

---

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**
   - WebSocket integration
   - Live cursors
   - Presence indicators

2. **Advanced Conflict Resolution**
   - Three-way merge
   - Automatic resolution
   - Conflict visualization

3. **Audit & Compliance**
   - Detailed audit logs
   - Compliance reports
   - Change signatures

4. **Performance Improvements**
   - Change aggregation
   - Incremental snapshots
   - Compression

5. **UI Enhancements**
   - Visual diff on map
   - Timeline visualization
   - Branching diagram

---

## Conclusion

This versioning system provides enterprise-grade change tracking with:

- ✅ Complete audit trail
- ✅ Unlimited undo/redo
- ✅ Version branching
- ✅ Atomic operations
- ✅ Performance optimized
- ✅ Type-safe
- ✅ Next.js 15 compliant

For questions or issues, refer to:
- [Implementation Summary](IMPLEMENTATION_SUMMARY_VERSIONING.md)
- [Quick Start Guide](QUICK_START.md)
- Server action source code