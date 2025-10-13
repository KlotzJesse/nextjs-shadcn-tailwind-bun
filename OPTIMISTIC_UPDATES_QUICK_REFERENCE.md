# Optimistic Updates - Quick Reference

## 🚀 Quick Implementation Guide

### Basic Template

```tsx
import { useOptimistic, useTransition } from "react";

function MyComponent({ serverData }) {
  // 1. Create optimistic state
  const [optimisticData, updateOptimisticData] = useOptimistic(
    serverData,
    (state, update) => {
      // Your optimistic update logic
      return { ...state, ...update };
    }
  );

  // 2. Create transition
  const [isPending, startTransition] = useTransition();

  // 3. Handler with optimistic update
  const handleAction = async () => {
    // Update optimistically FIRST
    updateOptimisticData({ status: 'updating' });

    // Then call server action in transition
    startTransition(async () => {
      try {
        const result = await serverAction();
        if (result.success) {
          toast.success("Success!");
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error("Failed");
        // React automatically reverts optimistic update
      }
    });
  };

  // 4. Use optimistic state in render
  return <div>{optimisticData.status}</div>;
}
```

---

## 📋 Implementation Checklist

For any new optimistic update:

- [ ] Import `useOptimistic` and `useTransition`
- [ ] Create optimistic state with reducer
- [ ] Call `updateOptimistic()` BEFORE server action
- [ ] Wrap server action in `startTransition()`
- [ ] Use optimistic state in render (not server state)
- [ ] Add toast notifications for feedback
- [ ] Test instant feedback (should be < 16ms)
- [ ] Test error rollback
- [ ] Check TypeScript errors
- [ ] Verify no console errors

---

## 🎯 Common Patterns

### Pattern 1: Simple State Update
```tsx
const [optimisticValue, updateOptimisticValue] = useOptimistic(
  value,
  (_state, newValue) => newValue
);

// Usage
updateOptimisticValue(newValue);
```

### Pattern 2: Object Update
```tsx
const [optimisticData, updateOptimisticData] = useOptimistic(
  data,
  (state, update) => ({ ...state, ...update })
);

// Usage
updateOptimisticData({ status: 'loading', progress: 50 });
```

### Pattern 3: Array Update (Add)
```tsx
const [optimisticItems, updateOptimisticItems] = useOptimistic(
  items,
  (state, newItem) => [...state, newItem]
);

// Usage
updateOptimisticItems({ id: 'temp', name: 'New Item' });
```

### Pattern 4: Array Update (Remove)
```tsx
const [optimisticItems, updateOptimisticItems] = useOptimistic(
  items,
  (state, idToRemove) => state.filter(item => item.id !== idToRemove)
);

// Usage
updateOptimisticItems(itemId);
```

### Pattern 5: Array Update (Modify)
```tsx
const [optimisticItems, updateOptimisticItems] = useOptimistic(
  items,
  (state, { id, updates }) =>
    state.map(item => item.id === id ? { ...item, ...updates } : item)
);

// Usage
updateOptimisticItems({ id: 1, updates: { name: 'Updated' } });
```

### Pattern 6: Counter Increment
```tsx
const [optimisticCount, updateOptimisticCount] = useOptimistic(
  count,
  (state, delta) => state + delta
);

// Usage
updateOptimisticCount(1); // increment
updateOptimisticCount(-1); // decrement
```

---

## 🔗 Cross-Component Coordination

When optimistic updates need to affect multiple components:

```tsx
// Parent Component
function Parent() {
  const [optimisticData, updateOptimisticData] = useOptimistic(
    serverData,
    reducer
  );

  return (
    <>
      <Child1
        data={optimisticData}
        onUpdate={updateOptimisticData}
      />
      <Child2
        data={optimisticData}
        onUpdate={updateOptimisticData}
      />
    </>
  );
}

// Child Component
function Child1({ data, onUpdate }) {
  const handleAction = () => {
    onUpdate({ type: 'increment' });
    startTransition(async () => {
      await serverAction();
    });
  };

  return <button onClick={handleAction}>{data.count}</button>;
}
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Don't do this:
```tsx
// Calling server action BEFORE optimistic update
startTransition(async () => {
  await serverAction();
  updateOptimisticData(newValue); // TOO LATE!
});
```

### ✅ Do this instead:
```tsx
// Update optimistically FIRST
updateOptimisticData(newValue);
startTransition(async () => {
  await serverAction();
});
```

---

### ❌ Don't do this:
```tsx
// Using server state in render
return <div>{serverData.value}</div>;
```

### ✅ Do this instead:
```tsx
// Use optimistic state in render
return <div>{optimisticData.value}</div>;
```

---

### ❌ Don't do this:
```tsx
// Manual error rollback
try {
  await serverAction();
} catch (error) {
  setData(previousData); // Unnecessary!
}
```

### ✅ Do this instead:
```tsx
// React handles rollback automatically
try {
  await serverAction();
} catch (error) {
  toast.error("Failed");
  // React reverts optimistic update automatically
}
```

---

## 🎨 UI Feedback Best Practices

### Loading States
```tsx
// Show optimistic loading state
const [optimisticLoading, updateOptimisticLoading] = useOptimistic(
  false,
  (_state, loading) => loading
);

// Usage
<Button disabled={optimisticLoading || isPending}>
  {optimisticLoading ? "Loading..." : "Submit"}
</Button>
```

### Progress Indicators
```tsx
// Show optimistic progress
const [optimisticProgress, updateOptimisticProgress] = useOptimistic(
  0,
  (_state, progress) => progress
);

// Usage
updateOptimisticProgress(0);    // Start
updateOptimisticProgress(50);   // Halfway
updateOptimisticProgress(100);  // Complete
```

### Success States
```tsx
// Show optimistic success
const [optimisticSuccess, updateOptimisticSuccess] = useOptimistic(
  false,
  (_state, success) => success
);

// Usage
updateOptimisticSuccess(true);
startTransition(async () => {
  await serverAction();
  // Success state persists until component updates
});
```

---

## 🧪 Testing Checklist

For each optimistic update implementation:

### Visual Tests:
- [ ] Click/action shows instant feedback (< 16ms)
- [ ] Loading state appears immediately
- [ ] Success state shows before server completes
- [ ] Error state reverts to previous state
- [ ] UI remains responsive during action

### Functional Tests:
- [ ] Server action completes successfully
- [ ] Data persists after page refresh
- [ ] Error cases handled gracefully
- [ ] Concurrent actions work correctly
- [ ] Navigation works after actions

### Code Quality:
- [ ] No TypeScript errors
- [ ] No console warnings/errors
- [ ] Toast notifications work
- [ ] Proper error handling
- [ ] Code follows patterns

---

## 📊 Performance Targets

All optimistic updates should achieve:

- **Perceived Latency:** < 16ms (instant to human perception)
- **Server Action Time:** < 500ms (background completion)
- **Total Time to Permanent:** < 1000ms (optimistic → permanent)
- **Error Recovery:** < 16ms (automatic rollback)

---

## 🔍 Debugging Tips

### Check if optimistic update is working:
1. Add console.log in reducer:
```tsx
const [optimistic, update] = useOptimistic(data, (state, action) => {
  console.log('Optimistic update:', action);
  return { ...state, ...action };
});
```

2. Verify instant feedback:
- Click action
- Should see change in < 16ms
- Console.log should fire immediately

3. Verify automatic rollback:
- Temporarily make server action fail
- Should see state revert automatically

### Common Issues:

**Issue:** Update doesn't show instantly
- **Fix:** Make sure `updateOptimistic()` is called BEFORE `startTransition()`

**Issue:** State doesn't revert on error
- **Fix:** Verify you're using optimistic state in render, not server state

**Issue:** TypeScript errors
- **Fix:** Properly type the reducer function parameters

---

## 📚 Where to Find Examples

All implementations are in the codebase:

1. **Simple Update:** `create-area-dialog.tsx`
2. **Array Operations:** `nav-areas.tsx`
3. **Object Updates:** `bulk-import-dialog.tsx`
4. **Counter Updates:** `undo-redo-toolbar.tsx`
5. **Complex State:** `postal-codes-view-client-layers.tsx`
6. **Cross-Component:** `postal-codes-view` → `undo-redo-toolbar`

---

## ✨ Quick Wins

Easy places to add optimistic updates:

1. **Button clicks** - Instant feedback
2. **Form submissions** - Instant validation
3. **Toggle switches** - Instant state change
4. **Delete operations** - Instant removal
5. **Create operations** - Instant addition
6. **Update operations** - Instant modification

---

**Remember:** All user interactions should feel instant! 🚀

If it takes > 16ms to show feedback, add an optimistic update!
