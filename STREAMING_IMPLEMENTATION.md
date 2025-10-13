# Server and Client Component Data Pattern

## Overview
This document describes the implementation of the proper Server/Client Component data pattern in Next.js 15, following React best practices for component architecture.

## Key Principles

### 1. **Server Components: Await Data Directly**
Server Components should fetch and await data directly. They are async by default and run only on the server.

### 2. **Client Components: Only When Necessary**
Use `"use client"` directive ONLY when components need:
- React hooks (useState, useEffect, useContext, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser-only APIs (window, localStorage, etc.)
- Third-party libraries that use client-side features

### 3. **Data Flow: Server → Client**
- Server Components await data and pass resolved values as props to Client Components
- Client Components receive regular props (not promises)
- The `use()` hook is NOT needed when Server Components await before passing data

### 4. **Suspense Boundaries**
Wrap async Server Components in `<Suspense>` boundaries with fallback UI for loading states.

## Implementation Pattern

### ✅ Correct Pattern

**Server Component** (awaits data):
```tsx
// No "use client" - this is a Server Component
export default async function ServerComponent() {
  // Await data directly in Server Component
  const data = await fetchData();

  // Pass awaited data to Client Component
  return <ClientComponent data={data} />;
}
```

**Client Component** (receives data):
```tsx
"use client"; // Only because it uses hooks/interactivity

export function ClientComponent({ data }) {
  const [state, setState] = useState(null);

  return (
    <div onClick={() => setState(data)}>
      {data.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
}
```

### ❌ Incorrect Pattern (Over-Engineering)

**Don't use promises + use() hook when Server Components can await:**
```tsx
// ❌ Don't do this
export default async function ServerComponent() {
  const dataPromise = fetchData(); // Don't create promise
  return <ClientComponent dataPromise={dataPromise} />; // Don't pass promise
}

"use client";
export function ClientComponent({ dataPromise }) {
  const data = use(dataPromise); // Don't use use() hook unnecessarily
  return <div>{data.map(...)}</div>;
}
```

## Implementation Details

### Component Classification

#### Server Components (No "use client")
These components await data directly:

1. **VersionIndicator** - Simple display component
2. **ServerPostalCodesView** - Data orchestrator
3. **NavAreasServer** - Wrapper for client component
4. **AppSidebarWithData** - Layout data fetcher

#### Client Components ("use client")
These components need client-side features:

1. **AppSidebar** - Uses `useState`, `useRouter`, event handlers
2. **NavAreas** - Uses `useState`, `useOptimistic`, `useRouter`
3. **PostalCodesViewClientWithLayers** - Complex state management, map interactions
4. **DrawingTools** - Interactive drawing features
5. **All UI components with onClick, onChange, etc.**

### Data Flow Examples

#### Example 1: Layout → Sidebar

**Server Component** (`layout.tsx`):
```tsx
async function AppSidebarWithData() {
  await connection();

  // Server Component: await data directly
  const areas = await getAreas();

  // Pass awaited data to Client Component
  return <AppSidebar variant="inset" areas={areas} />;
}
```

**Client Component** (`app-sidebar.tsx`):
```tsx
"use client"; // Needed for useState, useRouter, onClick handlers

interface AppSidebarProps {
  areas: Area[]; // Regular prop, not Promise
}

export function AppSidebar({ areas, ...props }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Use areas directly, no use() hook needed
  return <Sidebar>{areas.map(...)}</Sidebar>;
}
```

#### Example 2: Page → View

**Server Component** (`page.tsx`):
```tsx
export default async function PostalCodesPage({ params }) {
  const { areaId } = await params;

  // Await data in Server Component
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ServerPostalCodesView areaId={areaId} />
    </Suspense>
  );
}
```

**Server Component** (`server-postal-codes-view.tsx`):
```tsx
export default async function ServerPostalCodesView({ areaId }) {
  // Server Component: await all data in parallel
  const [postalCodesData, statesData] = await Promise.all([
    getPostalCodesDataForGranularity(granularity),
    getStatesData(),
  ]);

  const [areas, layers, versions] = await Promise.all([
    getAreas(),
    getLayers(areaId),
    getVersions(areaId),
  ]);

  // Pass all awaited data to Client Component
  return (
    <PostalCodesViewClientWithLayers
      initialData={postalCodesData}
      statesData={statesData}
      initialLayers={layers}
      versions={versions}
    />
  );
}
```

**Client Component** (`postal-codes-view-client-layers.tsx`):
```tsx
"use client"; // Needed for useState, useOptimistic, map interactions

interface PostalCodesViewClientWithLayersProps {
  initialData: FeatureCollection; // Regular props
  statesData: FeatureCollection;
  initialLayers: Layer[];
  versions: Version[];
}

export function PostalCodesViewClientWithLayers({
  initialData,
  statesData,
  initialLayers,
  versions,
}) {
  // Use data directly, no use() hook needed
  const [layers, setLayers] = useState(initialLayers);

  return <Map data={initialData} layers={layers} />;
}
```

#### Example 3: Simple Server Component

**Server Component** (`version-indicator.tsx`):
```tsx
// No "use client" - pure Server Component
export async function VersionIndicator({ areaId }) {
  if (!areaId) return null;

  // Server Component: await data directly
  const area = await getAreaById(areaId);
  const versionInfo = await getVersionIndicatorInfo(areaId, area.currentVersionNumber);

  if (!versionInfo.hasVersions) return null;

  // Render directly, no Client Component needed
  return (
    <div>
      <Badge>{versionInfo.versionNumber}</Badge>
      <Button>View Version</Button>
    </div>
  );
}
```

## Benefits of This Pattern

### 1. **Simplicity**
- No unnecessary promise passing
- No `use()` hook complexity
- Straightforward data flow: Server awaits → Client receives

### 2. **Performance**
- Server Components can await data in parallel
- All data fetching happens on the server
- Client receives fully resolved data
- Smaller client-side JavaScript bundle

### 3. **Type Safety**
- Props are typed as concrete types, not Promises
- Easier to reason about component interfaces
- Better IDE autocomplete and type checking

### 4. **Maintainability**
- Clear separation: Server = data fetching, Client = interactivity
- Easy to identify which components do what
- Follows React Server Component best practices

### 5. **Optimal Rendering**
- Server Components render to HTML on server
- Only interactive parts hydrate on client
- Automatic code splitting at Server/Client boundary

## When to Use use() Hook

The `use()` hook should ONLY be used in rare cases where:

1. You're implementing a streaming pattern for very large datasets
2. You want to show partial UI while data loads incrementally
3. You're building a library that wraps promises
4. You have a specific performance optimization need

**For most applications, Server Components should await data and pass it to Client Components.**

## Suspense Boundaries

All async Server Components should be wrapped in Suspense:

```tsx
<Suspense fallback={<LoadingSkeleton />}>
  <AsyncServerComponent />
</Suspense>
```

This provides:
- Loading states while data fetches
- Progressive rendering
- Error boundary integration

## Migration Checklist

✅ Server Components await data directly
✅ Client Components only use "use client" when needed
✅ Data passed as regular props (not promises)
✅ No unnecessary use() hook calls
✅ Suspense boundaries around async components
✅ Clear Server/Client component separation
✅ No TypeScript errors
✅ Simplified architecture

## Files Modified

### Server Components (Await Data)
- `src/app/(map)/layout.tsx` - AppSidebarWithData
- `src/components/areas/nav-areas-server.tsx` - NavAreasContent
- `src/components/postal-codes/server-postal-codes-view.tsx` - ServerPostalCodesView
- `src/components/shared/version-indicator.tsx` - VersionIndicator

### Client Components (Receive Data)
- `src/components/app-sidebar.tsx` - AppSidebar
- `src/components/areas/nav-areas.tsx` - NavAreas
- `src/components/postal-codes/postal-codes-view-client-layers.tsx` - PostalCodesViewClientWithLayers

### Removed Files
- `src/components/shared/version-indicator-client.tsx` - No longer needed

## Testing

To verify the implementation:

1. ✅ **Check TypeScript** - No errors
2. ✅ **Check Build** - Application compiles successfully
3. ✅ **Check Runtime** - No console errors
4. ✅ **Check Network** - Data fetches on server
5. ✅ **Check Hydration** - Only interactive components hydrate

## Conclusion

This pattern follows React and Next.js best practices:
- Server Components for data fetching (await directly)
- Client Components for interactivity (receive props)
- Clear boundaries with Suspense
- Simple, maintainable, performant

The `use()` hook is a specialized tool for advanced use cases. For standard data fetching, Server Components with async/await provide a simpler, more performant solution.

## Key Principles Implemented

### 1. **Server Components: Initiate but Don't Await**
All Server Components now initiate data fetching but don't await the results. Instead, they pass promises to Client Components.

### 2. **Client Components: Use the use() Hook**
Client Components consume promises using React's `use()` hook, which allows streaming of data from server to client.

### 3. **Suspense Boundaries Everywhere**
All components that consume promises are wrapped in `<Suspense>` boundaries with appropriate fallback UI.

### 4. **Progressive Loading**
The application now loads progressively, showing loading states for individual components while others continue to render.

## Implementation Details

### Pages

#### `/app/(map)/layout.tsx`
- **Changed**: `AppSidebarWithData` now passes `areasPromise` instead of awaited `areas`
- **Pattern**: Server Component initiates fetch, Client Component consumes promise

```tsx
// Before
const areas = await getAreas();
return <AppSidebar variant="inset" areas={areas} />;

// After
const areasPromise = getAreas();
return <AppSidebar variant="inset" areasPromise={areasPromise} />;
```

#### `/app/(map)/postal-codes/[areaId]/page.tsx`
- **Already using Suspense**: This page correctly wraps components in Suspense boundaries
- **Pattern**: Server Component with proper Suspense wrapping

### Components

#### `AppSidebar` (`components/app-sidebar.tsx`)
- **Changed**: Now accepts `areasPromise: Promise<Area[]>` instead of `areas: Area[]`
- **Added**: `use(areasPromise)` to consume the promise
- **Pattern**: Client Component with use() hook

```tsx
// Before
interface AppSidebarProps {
  areas?: Area[];
}
export function AppSidebar({ areas = [], ...props }) {
  // Use areas directly
}

// After
interface AppSidebarProps {
  areasPromise: Promise<Area[]>;
}
export function AppSidebar({ areasPromise, ...props }) {
  const areas = use(areasPromise);
  // Now use areas
}
```

#### `NavAreasServer` (`components/areas/nav-areas-server.tsx`)
- **Changed**: Passes `areasPromise` to `NavAreas` instead of awaited areas
- **Pattern**: Server Component that doesn't await

```tsx
// Before
const areas = await getAreas();
return <NavAreas areas={areas} />;

// After
const areasPromise = getAreas();
return <NavAreas areasPromise={areasPromise} />;
```

#### `NavAreas` (`components/areas/nav-areas.tsx`)
- **Changed**: Now accepts `areasPromise: Promise<Area[]>` and uses `use()` hook
- **Added**: Import for `use` from React
- **Pattern**: Client Component with use() hook

#### `ServerPostalCodesView` (`components/postal-codes/server-postal-codes-view.tsx`)
- **Changed**: All data fetches are now initiated without await, promises passed to client component
- **Pattern**: Server Component with multiple parallel data fetches

```tsx
// Before
const [postalCodesData, statesData] = await Promise.all([...]);
const [areas, area, layers, ...] = await Promise.all([...]);

// After
const postalCodesDataPromise = getPostalCodesDataForGranularity(defaultGranularity);
const statesDataPromise = getStatesData();
const areasPromise = getAreas();
// ... all as promises
```

#### `PostalCodesViewClientWithLayers` (`components/postal-codes/postal-codes-view-client-layers.tsx`)
- **Changed**: Interface updated to accept promises instead of resolved data
- **Added**: Multiple `use()` calls to consume all promises
- **Pattern**: Client Component consuming multiple promises

```tsx
// Before
interface PostalCodesViewClientWithLayersProps {
  initialData: FeatureCollection;
  statesData: FeatureCollection;
  initialLayers: Layer[];
  // ... etc
}

// After
interface PostalCodesViewClientWithLayersProps {
  postalCodesDataPromise: Promise<FeatureCollection>;
  statesDataPromise: Promise<FeatureCollection>;
  layersPromise: Promise<Layer[]>;
  // ... all as promises
}

export function PostalCodesViewClientWithLayers({ ... }) {
  // Use the use() hook to consume promises
  const initialData = use(postalCodesDataPromise);
  const statesData = use(statesDataPromise);
  const initialLayers = use(layersPromise);
  // ... etc
}
```

#### `VersionIndicator` (`components/shared/version-indicator.tsx`)
- **Refactored**: Split into Server Component (data fetching) and Client Component (rendering)
- **New File**: `version-indicator-client.tsx` - Client Component with use() hook
- **Pattern**: Server/Client split with promise passing

**Server Component** (`version-indicator.tsx`):
```tsx
export async function VersionIndicator({ areaId }) {
  if (!areaId) return null;

  const areaPromise = getAreaById(areaId);
  const area = await areaPromise; // Need version number

  const versionInfoPromise = getVersionIndicatorInfo(
    areaId,
    area.currentVersionNumber
  );

  return <VersionIndicatorClient versionInfoPromise={versionInfoPromise} />;
}
```

**Client Component** (`version-indicator-client.tsx`):
```tsx
export function VersionIndicatorClient({ versionInfoPromise }) {
  const versionInfo = use(versionInfoPromise);
  // Render UI
}
```

## Benefits

### 1. **Faster Initial Page Load**
- Server Components start streaming HTML immediately
- Client sees content progressively as it becomes available
- No more waiting for all data before showing anything

### 2. **Better User Experience**
- Loading states are granular and specific to each component
- Users see parts of the page immediately while others load
- Perceived performance is significantly improved

### 3. **Parallel Data Fetching**
- Multiple data fetches happen in parallel
- No sequential blocking
- Optimal use of network resources

### 4. **Proper Suspense Integration**
- All async boundaries are properly defined
- Loading states are consistent and predictable
- Error boundaries work correctly

### 5. **Following Best Practices**
- Aligns with Next.js 15 and React 19 patterns
- Uses experimental PPR (Partial Prerendering) effectively
- Prepares codebase for future React features

## Suspense Boundaries

All components that consume promises are wrapped in Suspense:

1. **AppSidebar** - Wrapped in layout.tsx
2. **NavAreas** - Wrapped in NavAreasServer
3. **ServerPostalCodesView** - Wrapped in page.tsx
4. **VersionIndicator** - Wrapped in SiteHeader

## Data Fetching Functions

All data fetching functions in `lib/db/data-functions.ts` are already optimized:
- Use `'use cache'` directive
- Use `unstable_cacheTag` for cache invalidation
- Return promises that can be consumed by use() hook
- Support parallel fetching patterns

## Migration Checklist

✅ Server Components initiate fetches without awaiting
✅ Client Components use the use() hook
✅ All async components wrapped in Suspense
✅ Loading fallbacks defined for all boundaries
✅ Promises passed as props to Client Components
✅ Error boundaries in place
✅ No compile errors
✅ TypeScript types updated for promises

## Testing

To verify the implementation:

1. **Check Network Tab**: Data requests should start immediately when page loads
2. **Check Loading States**: Components should show individual loading states
3. **Check Progressive Rendering**: Page should render progressively, not all at once
4. **Check Suspense Boundaries**: Each boundary should show its fallback appropriately

## Future Enhancements

- Consider adding more granular Suspense boundaries for better UX
- Implement skeleton loaders that match component structure
- Add error boundaries for each Suspense boundary
- Monitor real-world performance metrics
- Consider using streaming for large data sets

## References

- [Next.js Fetching Data Documentation](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Streaming Data with use() Hook](https://nextjs.org/docs/app/getting-started/fetching-data#streaming-data-with-the-use-hook)
- [React use() Hook Documentation](https://react.dev/reference/react/use)
- [Suspense for Data Fetching](https://react.dev/reference/react/Suspense)
