# Versioning and Change Tracking System

## Overview

This document describes the comprehensive versioning and change tracking system implemented for the map area management application. The system provides real-time change tracking, undo/redo functionality, and version management with branching capabilities.

## Architecture

### Event Sourcing Pattern

The system uses an event sourcing pattern where every change is recorded as an immutable event. This provides:

- **Complete audit trail** of all changes
- **Undo/redo capabilities** by replaying or reversing events
- **Version branching** from any point in history
- **Change analytics** and insights

### Database Schema

#### 1. `area_changes` Table

Tracks every individual change made to an area:

```typescript
{
  id: number;                  // Unique change ID
  areaId: number;             // Area this change belongs to
  changeType: string;         // Type: create_layer, update_layer, add_postal_codes, etc.
  entityType: string;         // Entity affected: area, layer, postal_code
  entityId: number;           // ID of affected entity
  changeData: jsonb;          // New state/what changed
  previousData: jsonb;        // Previous state for undo
  versionId: number;          // Associated version (nullable)
  sequenceNumber: number;     // Order of change within area
  isUndone: boolean;          // Whether change was undone
  createdBy: string;          // User who made the change
  createdAt: timestamp;       // When change occurred
}
```

#### 2. `area_undo_stacks` Table

Manages undo/redo stacks per area:

```typescript
{
  id: number;
  areaId: number;             // Area ID (unique constraint)
  undoStack: number[];        // Array of change IDs that can be undone
  redoStack: number[];        // Array of change IDs that can be redone
  updatedAt: timestamp;
}
```

#### 3. Enhanced `area_versions` Table

Stores version snapshots with branching support:

```typescript
{
  id: number;
  areaId: number;
  versionNumber: number;
  name: string;
  description: string;
  snapshot: jsonb;            // Full state snapshot
  changesSummary: string;
  parentVersionId: number;    // For branching
  branchName: string;         // Branch identifier
  isActive: boolean;          // Currently active version
  changeCount: number;        // Number of changes in version
  createdBy: string;
  createdAt: timestamp;
}
```

#### 4. Enhanced `areas` Table

```typescript
{
  // ... existing fields
  currentVersionId: number;   // FK to active version
}
```

## Features

### 1. Real-time Change Tracking

Every operation automatically records changes:

```typescript
// Example: Adding postal codes
await addPostalCodesToLayerAction(areaId, layerId, codes, "user@example.com");

// Automatically records:
{
  changeType: "add_postal_codes",
  entityType: "postal_code",
  entityId: layerId,
  changeData: { postalCodes: ["12345", "67890"] },
  createdBy: "user@example.com"
}
```

### 2. Undo/Redo

**Keyboard Shortcuts:**
- `Ctrl+Z` (or `Cmd+Z`) - Undo last change
- `Ctrl+Shift+Z` (or `Cmd+Shift+Z` or `Ctrl+Y`) - Redo last undone change

**Programmatic Usage:**

```typescript
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";

function MyComponent({ areaId }) {
  const { canUndo, canRedo, undo, redo, undoCount, redoCount } = useUndoRedo(areaId);
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo ({undoCount})
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo ({redoCount})
      </button>
    </div>
  );
}
```

### 3. Version Management

#### Creating Versions

**Manual Save:**
```typescript
await createVersionAction(areaId, {
  name: "Sprint 1 Complete",
  description: "All postal codes for region A",
  changesSummary: "Added 150 postal codes across 3 layers",
  createdBy: "user@example.com"
});
```

**Auto-save:**
```typescript
await autoSaveVersionAction(areaId, "user@example.com");
// Creates automatic version with change count
```

#### Version Branching

Create a new branch from any previous version:

```typescript
await restoreVersionAction(areaId, oldVersionId, {
  createBranch: true,
  branchName: "Alternative Design",
  createdBy: "user@example.com"
});
```

This allows you to:
1. Jump back to any version
2. Make changes from that point
3. Create a new timeline without affecting the main branch

#### Comparing Versions

```typescript
const result = await compareVersionsAction(version1Id, version2Id);

// Returns:
{
  layersAdded: [...],
  layersRemoved: [...],
  layersModified: [...],
  postalCodesAdded: [...],
  postalCodesRemoved: [...]
}
```

### 4. Change History

View all changes for an area:

```typescript
const result = await getChangeHistoryAction(areaId, {
  versionId: 5,           // Optional: filter by version
  limit: 50,              // Optional: limit results
  includeUndone: false    // Optional: show undone changes
});
```

## UI Components

### 1. UndoRedoToolbar

Add undo/redo controls to your UI:

```typescript
import { UndoRedoToolbar } from "@/components/areas/undo-redo-toolbar";

<UndoRedoToolbar 
  areaId={areaId}
  variant="floating"  // or "default"
/>
```

### 2. EnhancedVersionHistoryDialog

Complete version management interface:

```typescript
import { EnhancedVersionHistoryDialog } from "@/components/areas/enhanced-version-history-dialog";

<EnhancedVersionHistoryDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  areaId={areaId}
/>
```

Features:
- View all versions with metadata
- See complete change history
- Compare any two versions
- Restore previous versions
- Branch from any point

## Server Actions

### Change Tracking Actions

Located in [`src/app/actions/change-tracking-actions.ts`](src/app/actions/change-tracking-actions.ts):

- `recordChangeAction()` - Record a new change
- `undoChangeAction()` - Undo the last change
- `redoChangeAction()` - Redo the last undone change
- `getChangeHistoryAction()` - Get change history
- `getUndoRedoStatusAction()` - Get undo/redo stack status
- `clearUndoRedoStacksAction()` - Clear undo/redo stacks

### Version Actions

Located in [`src/app/actions/version-actions.ts`](src/app/actions/version-actions.ts):

- `createVersionAction()` - Create a new version
- `autoSaveVersionAction()` - Auto-save current state
- `getVersionsAction()` - Get all versions
- `getVersionAction()` - Get a specific version
- `restoreVersionAction()` - Restore a version (with branching)
- `deleteVersionAction()` - Delete a version
- `compareVersionsAction()` - Compare two versions

### Updated Actions

All existing area and layer actions now support change tracking:

```typescript
// All these actions now have an optional createdBy parameter
createLayerAction(areaId, data, "user@example.com")
updateLayerAction(areaId, layerId, data, "user@example.com")
deleteLayerAction(areaId, layerId, "user@example.com")
addPostalCodesToLayerAction(areaId, layerId, codes, "user@example.com")
removePostalCodesFromLayerAction(areaId, layerId, codes, "user@example.com")
updateAreaAction(id, data, "user@example.com")
```

## Database Migration

To apply the new schema:

```bash
# Option 1: Using the migration script (when database is configured)
bun run scripts/run-versioning-migration.ts

# Option 2: Using drizzle-kit (requires DATABASE_URL)
bunx drizzle-kit migrate
```

The migration adds:
- `area_changes` table
- `area_undo_stacks` table
- New columns to `area_versions` (parentVersionId, branchName, isActive, changeCount)
- New column to `areas` (currentVersionId)

## Workflow Examples

### Example 1: Basic Editing with Undo

```typescript
// User makes changes
await addPostalCodesToLayerAction(areaId, layerId, ["12345", "67890"]);
await updateLayerAction(areaId, layerId, { color: "#ff0000" });

// User realizes mistake
await undoChangeAction(areaId); // Reverts color change
await undoChangeAction(areaId); // Reverts postal code addition

// User changes mind
await redoChangeAction(areaId); // Re-applies postal code addition
```

### Example 2: Working with Versions

```typescript
// Make changes
await addPostalCodesToLayerAction(areaId, layerId, codes);

// Save milestone
const v1 = await createVersionAction(areaId, {
  name: "Phase 1",
  description: "Initial postal codes"
});

// Make more changes
await createLayerAction(areaId, { name: "New Layer" });
await addPostalCodesToLayerAction(areaId, newLayerId, moreCodes);

// Save another milestone
const v2 = await createVersionAction(areaId, {
  name: "Phase 2",
  description: "Added secondary layer"
});

// Later: Go back to Phase 1 and try different approach
await restoreVersionAction(areaId, v1.versionId, {
  createBranch: true,
  branchName: "Alternative Phase 2"
});
```

### Example 3: Version Comparison

```typescript
// Compare two versions to see what changed
const comparison = await compareVersionsAction(version1Id, version2Id);

console.log(`Layers added: ${comparison.layersAdded.length}`);
console.log(`Layers removed: ${comparison.layersRemoved.length}`);
console.log(`Postal codes added: ${comparison.postalCodesAdded.length}`);
```

## Performance Considerations

### Database Optimization

1. **Indexes** are created on:
   - `areaChanges.areaId` (for quick filtering)
   - `areaChanges.versionId` (for version-specific queries)
   - `areaChanges.sequenceNumber` (for ordering)
   - `areaChanges.createdAt` (for time-based queries)

2. **JSONB columns** allow efficient querying of change data

3. **Sequence numbers** provide deterministic ordering without timestamp collisions

### Cleanup Strategy

Consider implementing:

1. **Archive old changes**: Move changes older than X days to archive table
2. **Limit undo stack**: Keep only last N changes in undo stack
3. **Compress old versions**: Store only diffs for old versions

## Best Practices

### 1. Always Provide User Context

```typescript
// ✅ Good
await updateLayerAction(areaId, layerId, data, currentUser.email);

// ❌ Bad
await updateLayerAction(areaId, layerId, data);
```

### 2. Create Versions at Meaningful Points

```typescript
// ✅ Good: Before major changes
await createVersionAction(areaId, {
  name: "Before restructuring",
  description: "Backup before layer reorganization"
});

// Then make risky changes
```

### 3. Clear Undo Stack After Version Creation

The system automatically clears undo/redo stacks when creating a version, as versions represent "committed" states.

### 4. Use Branching for Experiments

```typescript
// Create experimental branch
await restoreVersionAction(areaId, stableVersionId, {
  createBranch: true,
  branchName: "Experimental Layout"
});

// If experiment fails, switch back to stable version
// If experiment succeeds, continue from new branch
```

## Troubleshooting

### Undo Stack Corruption

If undo/redo becomes inconsistent:

```typescript
await clearUndoRedoStacksAction(areaId);
```

### Version Not Updating

Ensure the area's `currentVersionId` is set:

```typescript
const area = await getAreaByIdAction(areaId);
console.log("Current version:", area.currentVersionId);
```

### Change Not Recorded

Check that:
1. The action includes the `createdBy` parameter
2. The action was successful
3. Database constraints are satisfied

## Future Enhancements

Potential improvements:

1. **Conflict Resolution**: Handle concurrent edits from multiple users
2. **Change Compression**: Compress sequential similar changes
3. **Visual Diff**: Show visual differences between versions on map
4. **Change Annotations**: Add comments/notes to specific changes
5. **Automatic Backups**: Schedule automatic version creation
6. **Collaboration**: Multi-user change tracking with per-user undo stacks

## API Reference

See full API documentation in:
- [`src/app/actions/change-tracking-actions.ts`](src/app/actions/change-tracking-actions.ts)
- [`src/app/actions/version-actions.ts`](src/app/actions/version-actions.ts)
- [`src/lib/hooks/use-undo-redo.ts`](src/lib/hooks/use-undo-redo.ts)