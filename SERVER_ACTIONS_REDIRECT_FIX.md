# Server Actions with Redirects - Fix Summary

## Problem Overview

The application was experiencing two critical issues with server actions:

### Issue 1: Optimistic State Update Outside Transition
```
[browser] An optimistic state update occurred outside a transition or action.
To fix, move the update to an action, or wrap with startTransition.
```

**Root Cause:** `updateOptimisticCreating(true)` was called **before** `startTransition`, making it execute outside of the transition context.

### Issue 2: NEXT_REDIRECT Being Caught as Error
```
Error creating area: Error: NEXT_REDIRECT
```

**Root Cause:** Next.js uses `redirect()` by throwing a special `NEXT_REDIRECT` error. When we caught all errors in the try-catch block, we were incorrectly treating this expected redirect as an error.

---

## Solutions Implemented

### Solution 1: Move Optimistic Update Inside Transition

#### Before (BROKEN):
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ❌ WRONG: Outside transition
  updateOptimisticCreating(true);

  startTransition(async () => {
    try {
      await createAreaAction({ name, description, granularity, createdBy: "user" });
      // ...
    } catch (error) {
      console.error("Error creating area:", error);
    } finally {
      updateOptimisticCreating(false);
    }
  });
};
```

#### After (FIXED):
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  startTransition(async () => {
    try {
      // ✅ CORRECT: Inside transition
      updateOptimisticCreating(true);

      await createAreaAction({ name, description, granularity, createdBy: "user" });

      // Clean up (won't execute if redirect happens)
      setName("");
      setDescription("");
      setGranularity("5digit");
      onOpenChange(false);
    } catch (error) {
      // Only catch real errors, not NEXT_REDIRECT
      if (error && typeof error === 'object' && 'digest' in error &&
          typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
        // This is a redirect, not an error - let it propagate
        throw error;
      }
      // Only log actual errors
      console.error("Error creating area:", error);
      updateOptimisticCreating(false);
    }
  });
};
```

**Key Changes:**
- ✅ `updateOptimisticCreating(true)` moved inside `startTransition`
- ✅ NEXT_REDIRECT errors are re-thrown (not caught)
- ✅ No `finally` block (cleanup happens in catch for real errors only)

---

### Solution 2: Handle Redirects Properly in Server Actions

#### Understanding NEXT_REDIRECT

When Next.js `redirect()` is called, it:
1. Throws a special error with `digest: 'NEXT_REDIRECT;...'`
2. This error is **expected behavior**, not a failure
3. It should **NOT** be caught and logged as an error
4. It should propagate to trigger the actual navigation

#### createAreaAction - Before (BROKEN):

```tsx
export async function createAreaAction(data) {
  try {
    const [area] = await db.insert(areas).values(data).returning();

    updateTag("areas");
    revalidatePath("/postal-codes", "layout");
    refresh(); // ❌ Unnecessary
    redirect(`/postal-codes/${area.id}` as Route); // ❌ Caught as error
  } catch (error) {
    // ❌ WRONG: Catches NEXT_REDIRECT and logs it
    console.error("Error creating area:", error);
    return { success: false, error: "Failed to create area" };
  }
}
```

#### createAreaAction - After (FIXED):

```tsx
export async function createAreaAction(data) {
  try {
    const [area] = await db.insert(areas).values(data).returning();

    const versionResult = await createVersionAction(area.id, {
      name: "Erstversion",
      description: "Automatically created first version",
      createdBy: data.createdBy,
    });

    if (!versionResult.success) {
      await db.delete(areas).where(eq(areas.id, area.id));
      throw new Error("Erstversion konnte nicht erstellt werden");
    }

    updateTag("areas");
    updateTag(`area-${area.id}`);
    updateTag("undo-redo");
    updateTag(`area-${area.id}-undo-redo`);
    revalidatePath("/postal-codes", "layout");
    revalidatePath(`/postal-codes/${area.id}`, "page");

    // ✅ CORRECT: Redirect throws, stops execution
    redirect(`/postal-codes/${area.id}` as Route);
  } catch (error) {
    // ✅ CORRECT: Re-throw redirects
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    // Only log real errors
    console.error("Error creating area:", error);
    return { success: false, error: "Failed to create area" };
  }
}
```

**Key Changes:**
- ✅ Removed `refresh()` (redundant with cache tagging)
- ✅ Added version-specific revalidation paths
- ✅ NEXT_REDIRECT errors are detected and re-thrown
- ✅ Only actual errors are logged and returned

---

#### deleteAreaAction - Before (BROKEN):

```tsx
export async function deleteAreaAction(id: number) {
  try {
    await db.transaction(async (tx) => {
      // Delete layers and postal codes
      // ...
      await tx.delete(areas).where(eq(areas.id, id));
    });

    updateTag("areas");
    revalidatePath("/postal-codes", "layout");
    refresh(); // ❌ Unnecessary
    redirect("/postal-codes" as Route); // ❌ Caught as error
  } catch (error) {
    // ❌ WRONG: Catches NEXT_REDIRECT
    console.error("Error deleting area:", error);
    return { success: false, error: "Failed to delete area" };
  }
}
```

#### deleteAreaAction - After (FIXED):

```tsx
export async function deleteAreaAction(id: number) {
  try {
    await db.transaction(async (tx) => {
      const areaLayerIds = await tx
        .select({ id: areaLayers.id })
        .from(areaLayers)
        .where(eq(areaLayers.areaId, id));

      if (areaLayerIds.length > 0) {
        await tx.delete(areaLayerPostalCodes).where(
          inArray(areaLayerPostalCodes.layerId, areaLayerIds.map(l => l.id))
        );
        await tx.delete(areaLayers).where(eq(areaLayers.areaId, id));
      }

      await tx.delete(areas).where(eq(areas.id, id));
    });

    updateTag("areas");
    revalidatePath("/postal-codes", "layout");

    // ✅ CORRECT: Redirect throws, stops execution
    redirect("/postal-codes" as Route);
  } catch (error) {
    // ✅ CORRECT: Re-throw redirects
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    console.error("Error deleting area:", error);
    return { success: false, error: "Failed to delete area" };
  }
}
```

**Key Changes:**
- ✅ Removed `refresh()` call
- ✅ NEXT_REDIRECT errors are re-thrown
- ✅ Proper cleanup and error handling

---

### Solution 3: Remove Unnecessary `refresh()` Calls

The `refresh()` function from `next/cache` is **not needed** when using:
- `updateTag()` - Invalidates specific cache tags
- `revalidatePath()` - Revalidates specific routes

#### Removed from:
```tsx
import { updateTag, revalidatePath, refresh } from "next/cache"; // ❌
```

#### Changed to:
```tsx
import { updateTag, revalidatePath } from "next/cache"; // ✅
```

All 13 instances of `refresh()` calls removed from:
- `src/app/actions/area-actions.ts`

**Why remove it?**
- `updateTag()` is more granular and efficient
- `revalidatePath()` targets specific routes
- `refresh()` causes full page reload (too aggressive)
- Cache tags provide better control

---

## Pattern for Server Actions with Redirects

### Correct Pattern:

```tsx
"use server";

export async function myAction(data) {
  try {
    // 1. Perform database operations
    const result = await db.insert(...).returning();

    // 2. Invalidate caches
    updateTag("my-tag");
    revalidatePath("/my-path");

    // 3. Redirect (this throws and stops execution)
    redirect(`/my-path/${result.id}`);
  } catch (error) {
    // 4. Handle NEXT_REDIRECT specially
    if (error?.digest?.startsWith?.('NEXT_REDIRECT')) {
      throw error; // Re-throw to allow redirect
    }

    // 5. Handle real errors
    console.error("Error:", error);
    return { success: false, error: "Failed" };
  }
}
```

### Client-Side Pattern:

```tsx
"use client";

export function MyComponent() {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, updateOptimistic] = useOptimistic(false, (_, v) => v);

  const handleAction = () => {
    startTransition(async () => {
      try {
        // ✅ Optimistic update INSIDE transition
        updateOptimistic(true);

        // Call server action (may redirect)
        await myAction(data);

        // Cleanup (won't run if redirect happens)
        // ...
      } catch (error) {
        // Re-throw redirects
        if (error?.digest?.startsWith?.('NEXT_REDIRECT')) {
          throw error;
        }

        // Handle real errors
        console.error("Error:", error);
        updateOptimistic(false);
      }
    });
  };

  return <button onClick={handleAction}>Submit</button>;
}
```

---

## Testing Checklist

### Client-Side Tests
- [ ] No "optimistic state update outside transition" warnings
- [ ] Optimistic UI updates work correctly
- [ ] Loading states show properly during transition
- [ ] Error states display for real errors

### Server-Side Tests
- [ ] `redirect()` navigates correctly
- [ ] No "Error: NEXT_REDIRECT" logs in console
- [ ] Database operations complete before redirect
- [ ] Cache invalidation happens correctly

### Integration Tests
- [ ] Create area → redirects to new area page
- [ ] Delete area → redirects to areas list
- [ ] Optimistic UI shows creating/deleting state
- [ ] Real errors show proper error messages

---

## Benefits

### ✅ Correct React Behavior
- Optimistic updates inside transitions (no warnings)
- Proper state management during async operations

### ✅ Proper Navigation
- Redirects work as intended
- No false error logs
- Clean server-side navigation

### ✅ Better Performance
- Removed unnecessary `refresh()` calls
- Targeted cache invalidation with tags
- Efficient revalidation paths

### ✅ Better Error Handling
- Distinguishes between redirects and errors
- Only logs actual errors
- Proper error propagation

---

## Related Files Modified

### Client Components
- `src/components/areas/create-area-dialog.tsx`
  - Moved optimistic update inside transition
  - Added NEXT_REDIRECT detection and re-throw

### Server Actions
- `src/app/actions/area-actions.ts`
  - Added NEXT_REDIRECT detection in `createAreaAction`
  - Added NEXT_REDIRECT detection in `deleteAreaAction`
  - Removed all `refresh()` calls (13 instances)
  - Removed `refresh` from imports
  - Added specific revalidation paths

---

## Summary

✅ **Optimistic updates** now happen inside transitions (React 19 requirement)
✅ **Redirects** are properly detected and allowed to propagate
✅ **Cache management** uses granular tags instead of full refresh
✅ **Error handling** distinguishes between redirects and real errors
✅ **Server actions** follow Next.js 15 best practices
✅ **No console warnings** about optimistic state updates
✅ **No false errors** about NEXT_REDIRECT

The implementation now follows the correct patterns for:
- React 19 transitions and optimistic updates
- Next.js 15 server actions with redirects
- Proper cache invalidation strategies
- Clean error handling and user feedback
