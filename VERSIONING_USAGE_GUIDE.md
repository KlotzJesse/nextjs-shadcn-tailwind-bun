# Versioning System Usage Guide

Complete guide for implementing and using the versioning system in your Next.js 15 application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Steps](#integration-steps)
3. [Usage Examples](#usage-examples)
4. [Advanced Patterns](#advanced-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Apply Database Migration

```bash
# Run the versioning migration
bun run scripts/run-versioning-migration.ts

# Or use drizzle-kit
bunx drizzle-kit migrate
```

### 2. Add UI Components to Your Page

```typescript
// src/app/(map)/postal-codes/page.tsx
import { UndoRedoToolbar } from "@/components/areas/undo-redo-toolbar";
import { EnhancedVersionHistoryDialog } from "@/components/areas/enhanced-version-history-dialog";

export default function PostalCodesPage() {
  const [areaId] = useState(1); // Your area ID
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      {/* Your existing content */}
      
      {/* Add undo/redo toolbar */}
      <UndoRedoToolbar areaId={areaId} variant="floating" />
      
      {/* Add version history button */}
      <Button onClick={() => setShowHistory(true)}>
        Version History
      </Button>
      
      {/* Add version history dialog */}
      <EnhancedVersionHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        areaId={areaId}
      />
    </div>
  );
}
```

### 3. Test Basic Features

1. Make a change (add a layer or postal codes)
2. Press `Ctrl+Z` to undo
3. Press `Ctrl+Shift+Z` to redo
4. Click "Version History" to see all versions
5. Create a manual version

---

## Integration Steps

### Step 1: Server-Side Integration

All your existing server actions already record changes automatically. No additional changes needed!

```typescript
// This already records changes
await createLayerAction(areaId, {
  name: "New Layer",
  color: "#ff0000"
}, "user@example.com");

// This too
await addPostalCodesToLayerAction(
  areaId,
  layerId,
  ["12345", "67890"],
  "user@example.com"
);
```

### Step 2: Client Component Integration

#### Basic Undo/Redo Hook

```typescript
"use client";

import { useUndoRedo } from "@/lib/hooks/use-undo-redo";

function MyComponent({ areaId }: { areaId: number }) {
  const { canUndo, canRedo, undo, redo, isLoading } = useUndoRedo(areaId);

  return (
    <div>
      <button onClick={undo} disabled={!canUndo || isLoading}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo || isLoading}>
        Redo
      </button>
    </div>
  );
}
```

#### Custom Toolbar

```typescript
"use client";

import { UndoRedoToolbar } from "@/components/areas/undo-redo-toolbar";

// Default variant (inline)
<UndoRedoToolbar areaId={areaId} variant="default" />

// Floating variant (bottom-center)
<UndoRedoToolbar areaId={areaId} variant="floating" />

// Custom styling
<UndoRedoToolbar 
  areaId={areaId} 
  className="my-custom-class"
/>
```

### Step 3: Version Management Integration

#### Manual Version Creation

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { createVersionAction } from "@/app/actions/version-actions";
import { toast } from "sonner";

function SaveVersionButton({ areaId }: { areaId: number }) {
  const handleSave = async () => {
    const result = await createVersionAction(areaId, {
      name: "Manual Save",
      description: "User-initiated version",
      createdBy: "user@example.com"
    });

    if (result.success) {
      toast.success(`Version ${result.data?.versionNumber} created`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Button onClick={handleSave}>
      Save Version
    </Button>
  );
}
```

#### Auto-Save Implementation

```typescript
"use client";

import { useEffect } from "react";
import { autoSaveVersionAction } from "@/app/actions/version-actions";

function AutoSaveProvider({ areaId, userEmail }: {
  areaId: number;
  userEmail: string;
}) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await autoSaveVersionAction(areaId, userEmail);
      if (result.success) {
        console.log("Auto-saved version", result.data?.versionId);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [areaId, userEmail]);

  return null; // This is a logic-only component
}

// Usage
<AutoSaveProvider areaId={areaId} userEmail="user@example.com" />
```

### Step 4: Version History UI

#### Full-Featured Version History

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EnhancedVersionHistoryDialog } from "@/components/areas/enhanced-version-history-dialog";

function VersionHistoryButton({ areaId }: { areaId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        View History
      </Button>
      <EnhancedVersionHistoryDialog
        open={open}
        onOpenChange={setOpen}
        areaId={areaId}
      />
    </>
  );
}
```

#### Custom Version List

```typescript
"use client";

import { useEffect, useState } from "react";
import { getVersionsAction } from "@/app/actions/version-actions";

function VersionList({ areaId }: { areaId: number }) {
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const loadVersions = async () => {
      const result = await getVersionsAction(areaId);
      if (result.success) {
        setVersions(result.data || []);
      }
    };
    loadVersions();
  }, [areaId]);

  return (
    <div>
      {versions.map((v) => (
        <div key={v.id}>
          <h3>Version {v.versionNumber}</h3>
          <p>{v.name}</p>
          <small>{new Date(v.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
```

---

## Usage Examples

### Example 1: Basic Layer Management with Undo

```typescript
"use client";

import { useState } from "react";
import { createLayerAction } from "@/app/actions/layer-actions";
import { UndoRedoToolbar } from "@/components/areas/undo-redo-toolbar";
import { toast } from "sonner";

export function LayerManager({ areaId }: { areaId: number }) {
  const [layerName, setLayerName] = useState("");

  const handleCreateLayer = async () => {
    const result = await createLayerAction(
      areaId,
      {
        name: layerName,
        color: "#3b82f6",
        opacity: 70,
        isVisible: true,
        orderIndex: 0
      },
      "user@example.com"
    );

    if (result.success) {
      toast.success("Layer created (Ctrl+Z to undo)");
      setLayerName("");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      <input
        value={layerName}
        onChange={(e) => setLayerName(e.target.value)}
        placeholder="Layer name"
      />
      <button onClick={handleCreateLayer}>Create Layer</button>
      
      {/* Undo/Redo toolbar */}
      <UndoRedoToolbar areaId={areaId} />
    </div>
  );
}
```

### Example 2: Version Comparison Workflow

```typescript
"use client";

import { useState } from "react";
import { 
  getVersionsAction, 
  compareVersionsAction 
} from "@/app/actions/version-actions";
import { Button } from "@/components/ui/button";

export function VersionComparison({ areaId }: { areaId: number }) {
  const [versions, setVersions] = useState([]);
  const [v1, setV1] = useState<number | null>(null);
  const [v2, setV2] = useState<number | null>(null);
  const [comparison, setComparison] = useState(null);

  const loadVersions = async () => {
    const result = await getVersionsAction(areaId);
    if (result.success) {
      setVersions(result.data || []);
    }
  };

  const compare = async () => {
    if (!v1 || !v2) return;
    
    const result = await compareVersionsAction(v1, v2);
    if (result.success) {
      setComparison(result.data);
    }
  };

  return (
    <div>
      <Button onClick={loadVersions}>Load Versions</Button>
      
      <select onChange={(e) => setV1(Number(e.target.value))}>
        <option>Select Version 1</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.versionNumber} - {v.name}
          </option>
        ))}
      </select>

      <select onChange={(e) => setV2(Number(e.target.value))}>
        <option>Select Version 2</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.versionNumber} - {v.name}
          </option>
        ))}
      </select>

      <Button onClick={compare}>Compare</Button>

      {comparison && (
        <div>
          <h3>Comparison Results</h3>
          <p>Layers Added: {comparison.layersAdded.length}</p>
          <p>Layers Removed: {comparison.layersRemoved.length}</p>
          <p>Layers Modified: {comparison.layersModified.length}</p>
          <p>Postal Codes Added: {comparison.postalCodesAdded.length}</p>
          <p>Postal Codes Removed: {comparison.postalCodesRemoved.length}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Branching Workflow

```typescript
"use client";

import { useState } from "react";
import { 
  getVersionsAction,
  restoreVersionAction 
} from "@/app/actions/version-actions";
import { toast } from "sonner";

export function BranchingExample({ areaId }: { areaId: number }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [branchName, setBranchName] = useState("");

  const createBranch = async () => {
    if (!selectedVersion || !branchName) return;

    const result = await restoreVersionAction(
      areaId,
      selectedVersion,
      {
        createBranch: true,
        branchName,
        createdBy: "user@example.com"
      }
    );

    if (result.success) {
      toast.success(`Branch "${branchName}" created`);
      // Reload page to show new branch
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      <h2>Create Branch from Version</h2>
      
      <select onChange={(e) => setSelectedVersion(Number(e.target.value))}>
        <option>Select Version</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.versionNumber} - {v.name}
          </option>
        ))}
      </select>

      <input
        value={branchName}
        onChange={(e) => setBranchName(e.target.value)}
        placeholder="Branch name"
      />

      <button onClick={createBranch}>Create Branch</button>
    </div>
  );
}
```

### Example 4: Change History Viewer

```typescript
"use client";

import { useEffect, useState } from "react";
import { getChangeHistoryAction } from "@/app/actions/change-tracking-actions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function ChangeHistory({ areaId }: { areaId: number }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChanges = async () => {
      const result = await getChangeHistoryAction(areaId, {
        limit: 50,
        includeUndone: false
      });
      
      if (result.success) {
        setChanges(result.data || []);
      }
      setLoading(false);
    };
    loadChanges();
  }, [areaId]);

  const getChangeLabel = (type: string) => {
    const labels: Record<string, string> = {
      create_layer: "Layer Created",
      update_layer: "Layer Updated",
      delete_layer: "Layer Deleted",
      add_postal_codes: "Postal Codes Added",
      remove_postal_codes: "Postal Codes Removed",
      update_area: "Area Updated",
    };
    return labels[type] || type;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      <h2>Change History</h2>
      {changes.map((change) => (
        <div key={change.id} className="border rounded p-3">
          <div className="flex justify-between items-start">
            <Badge>{getChangeLabel(change.changeType)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(change.createdAt), {
                addSuffix: true
              })}
            </span>
          </div>
          {change.createdBy && (
            <p className="text-sm text-muted-foreground mt-1">
              By: {change.createdBy}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Example 5: Version Indicator

```typescript
"use client";

import { useEffect, useState } from "react";
import { getVersionsAction } from "@/app/actions/version-actions";
import { Badge } from "@/components/ui/badge";

export function VersionIndicator({ areaId }: { areaId: number }) {
  const [activeVersion, setActiveVersion] = useState<any>(null);

  useEffect(() => {
    const loadActiveVersion = async () => {
      const result = await getVersionsAction(areaId);
      if (result.success && result.data) {
        const active = result.data.find((v) => v.isActive === "true");
        setActiveVersion(active);
      }
    };
    loadActiveVersion();
  }, [areaId]);

  if (!activeVersion) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default">
        v{activeVersion.versionNumber}
      </Badge>
      {activeVersion.branchName && (
        <Badge variant="secondary">
          {activeVersion.branchName}
        </Badge>
      )}
      {activeVersion.name && (
        <span className="text-sm text-muted-foreground">
          {activeVersion.name}
        </span>
      )}
    </div>
  );
}
```

---

## Advanced Patterns

### Pattern 1: Optimistic Updates with Rollback

```typescript
"use client";

import { useState } from "react";
import { updateLayerAction } from "@/app/actions/layer-actions";
import { toast } from "sonner";

export function OptimisticLayerUpdate({ 
  areaId, 
  layer 
}: { 
  areaId: number; 
  layer: any;
}) {
  const [localLayer, setLocalLayer] = useState(layer);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateColor = async (newColor: string) => {
    // Optimistic update
    const previousColor = localLayer.color;
    setLocalLayer({ ...localLayer, color: newColor });
    setIsUpdating(true);

    try {
      const result = await updateLayerAction(
        areaId,
        layer.id,
        { color: newColor },
        "user@example.com"
      );

      if (!result.success) {
        // Rollback on error
        setLocalLayer({ ...localLayer, color: previousColor });
        toast.error("Failed to update color");
      } else {
        toast.success("Color updated (Ctrl+Z to undo)");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <div
        style={{ backgroundColor: localLayer.color }}
        className="w-20 h-20 rounded"
      />
      <input
        type="color"
        value={localLayer.color}
        onChange={(e) => updateColor(e.target.value)}
        disabled={isUpdating}
      />
    </div>
  );
}
```

### Pattern 2: Batch Operations with Single Undo

```typescript
"use client";

import { 
  addPostalCodesToLayerAction,
  createVersionAction
} from "@/app/actions/layer-actions";
import { toast } from "sonner";

export function BatchPostalCodeImport({
  areaId,
  layerId
}: {
  areaId: number;
  layerId: number;
}) {
  const handleBatchImport = async (codes: string[]) => {
    // Split into chunks of 100
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < codes.length; i += chunkSize) {
      chunks.push(codes.slice(i, i + chunkSize));
    }

    // Process chunks
    for (const chunk of chunks) {
      await addPostalCodesToLayerAction(
        areaId,
        layerId,
        chunk,
        "user@example.com"
      );
    }

    // Create a version after batch operation
    await createVersionAction(areaId, {
      name: `Imported ${codes.length} postal codes`,
      createdBy: "user@example.com"
    });

    toast.success(`Imported ${codes.length} postal codes`);
  };

  return (
    <button onClick={() => handleBatchImport(/* codes */)}>
      Import Postal Codes
    </button>
  );
}
```

### Pattern 3: Conflict-Free Concurrent Editing

```typescript
"use client";

import { useEffect, useState } from "react";
import { getAreaByIdAction, updateAreaAction } from "@/app/actions/area-actions";
import { toast } from "sonner";

export function ConcurrentSafeEditor({ areaId }: { areaId: number }) {
  const [area, setArea] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const loadArea = async () => {
      const result = await getAreaByIdAction(areaId);
      if (result.success && result.data) {
        setArea(result.data);
        setLastUpdated(result.data.updatedAt);
      }
    };
    loadArea();
  }, [areaId]);

  const handleUpdate = async (newName: string) => {
    // Check for conflicts
    const current = await getAreaByIdAction(areaId);
    if (current.success && current.data?.updatedAt !== lastUpdated) {
      toast.error("Area was modified by another user. Please refresh.");
      return;
    }

    // Proceed with update
    const result = await updateAreaAction(
      areaId,
      { name: newName },
      "user@example.com"
    );

    if (result.success) {
      setLastUpdated(new Date().toISOString());
      toast.success("Updated successfully");
    }
  };

  return (
    <div>
      <input
        value={area?.name || ""}
        onChange={(e) => handleUpdate(e.target.value)}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Change Recording

✅ **DO:**
- Always pass `createdBy` for audit trail
- Use descriptive change types
- Record both forward and backward state
- Handle errors gracefully

❌ **DON'T:**
- Skip change recording
- Forget to handle undo data
- Make direct database modifications

### 2. Version Management

✅ **DO:**
- Create versions at logical milestones
- Use descriptive names and descriptions
- Implement auto-save for safety
- Clean up old versions periodically

❌ **DON'T:**
- Create versions for every change
- Use generic names like "Version 1"
- Keep unlimited old versions

### 3. Undo/Redo

✅ **DO:**
- Show undo/redo counts to users
- Provide keyboard shortcuts
- Clear stacks after version creation
- Give feedback after operations

❌ **DON'T:**
- Allow undo of committed versions
- Forget to handle errors
- Skip user confirmations for big changes

### 4. Performance

✅ **DO:**
- Use pagination for large lists
- Implement lazy loading
- Cache immutable data
- Monitor query performance

❌ **DON'T:**
- Load entire history at once
- Forget to add indexes
- Skip performance testing

---

## Troubleshooting

### Issue: Undo button disabled

**Cause:** No changes in undo stack

**Solution:**
```typescript
// Check undo status
const status = await getUndoRedoStatusAction(areaId);
console.log(status); // { canUndo, canRedo, undoCount, redoCount }
```

### Issue: Version creation fails

**Cause:** No uncommitted changes

**Solution:**
```typescript
// Check for uncommitted changes first
const changes = await getChangeHistoryAction(areaId, {
  versionId: null // Uncommitted changes
});

if (changes.data?.length === 0) {
  toast.info("No changes to save");
} else {
  await createVersionAction(areaId, { ... });
}
```

### Issue: Restore version slow

**Cause:** Large snapshot with many postal codes

**Solution:**
```typescript
// Show loading state
setLoading(true);
try {
  await restoreVersionAction(areaId, versionId);
  toast.success("Version restored");
} finally {
  setLoading(false);
}
```

### Issue: Concurrent modifications conflict

**Cause:** Multiple users editing simultaneously

**Solution:**
```typescript
// Implement optimistic locking
const current = await getAreaByIdAction(areaId);
if (current.data?.updatedAt !== expectedTimestamp) {
  // Show conflict resolution UI
  showConflictDialog();
}
```

---

## Migration Guide

### Migrating from No Versioning

1. **Run migration:**
   ```bash
   bun run scripts/run-versioning-migration.ts
   ```

2. **Update server actions:**
   ```typescript
   // Old (no versioning)
   await createLayerAction(areaId, layerData);

   // New (with versioning)
   await createLayerAction(areaId, layerData, "user@example.com");
   ```

3. **Add UI components:**
   ```typescript
   // Add to your page
   <UndoRedoToolbar areaId={areaId} />
   ```

4. **Test functionality:**
   - Make changes
   - Test undo/redo
   - Create versions
   - Restore versions

---

## Summary

The versioning system provides:

- ✅ **Automatic change tracking** - All operations recorded
- ✅ **Unlimited undo/redo** - Full history available
- ✅ **Version snapshots** - Save points in time
- ✅ **Branch from any version** - Experiment safely
- ✅ **Complete audit trail** - Who changed what when
- ✅ **Type-safe APIs** - End-to-end TypeScript
- ✅ **Next.js 15 compliant** - Server actions & components

For more details, see:
- [Architecture Documentation](VERSIONING_SYSTEM_ARCHITECTURE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY_VERSIONING.md)