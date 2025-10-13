# Data Fetching Push-Down Pattern

## Overview
This document describes the implementation of the "push-down" data fetching pattern where data is fetched as close as possible to where it's consumed. This leverages Next.js automatic deduplication and React's `use()` hook for optimal performance.

## Core Principle

**Fetch data where it's used, not where it's convenient.**

- ❌ Don't fetch in layout/page if the component doesn't use it
- ✅ Pass promises down the tree
- ✅ Let components consume data where needed
- ✅ Trust deduplication to handle efficiency

## Key Benefits

### 1. **Automatic Request Deduplication**
Next.js automatically deduplicates identical `fetch` requests and database calls within a single render pass. This means:
- Multiple components can request the same data
- Only one actual request is made
- No need to "hoist" data fetching to avoid duplication

### 2. **True Streaming**
- Components start rendering before all data is fetched
- Suspense boundaries show loading states granularly
- User sees content progressively

### 3. **Better Code Organization**
- Components are self-contained
- No prop drilling of data through components that don't use it
- Easier to move/refactor components

### 4. **Optimal Performance**
- Parallel data fetching happens automatically
- No waterfalls from sequential awaits
- Client gets streamed HTML as soon as possible

## Architecture Pattern

### Pattern: Server → Promise → Client → use()

```
Page (Server)
  ├─ No data fetching
  └─ ServerComponent (Server)
      ├─ Initiate fetches (don't await)
      ├─ Create promises
      └─ Pass promises to ClientComponent
          └─ ClientComponent (Client)
              ├─ use(promise) to consume
              └─ Render with data
```

## Implementation Examples

### Example 1: Layout → Sidebar → Areas

**Layout** (Server Component):
```tsx
// ❌ Before: Fetched here, passed down
async function AppSidebarWithData() {
  const areas = await getAreas();
  return <AppSidebar areas={areas} />;
}

// ✅ After: No fetching, let components handle it
export default async function MapLayout({ children }) {
  await connection();
  return (
    <Suspense fallback={<Skeleton />}>
      <AppSidebar variant="inset" />
    </Suspense>
  );
}
```

**AppSidebar** (Server Wrapper):
```tsx
// Server Component: just wraps client component
export async function AppSidebar(props) {
  return <AppSidebarClient {...props} />;
}
```

**NavAreasServer** (Server Component):
```tsx
// Initiates fetch and passes promise
async function NavAreasContent() {
  const areasPromise = getAreas(); // Don't await!

  return <NavAreas areasPromise={areasPromise} />;
}
```

**NavAreas** (Client Component):
```tsx
"use client";

export function NavAreas({ areasPromise }) {
  // use() hook consumes promise where data is actually needed
  const areas = use(areasPromise);

  return <div>{areas.map(...)}</div>;
}
```

### Example 2: Page → View → Map

**Page** (Server Component):
```tsx
// ❌ Before: Awaited granularity at page level
export default async function PostalCodesPage({ params }) {
  const { areaId } = await params;
  const area = await getAreaById(areaId);
  const granularity = area.granularity;

  return <ServerPostalCodesView granularity={granularity} />;
}

// ✅ After: Just pass what's needed, let component fetch
export default async function PostalCodesPage({ params }) {
  const { areaId } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ServerPostalCodesView areaId={areaId} />
    </Suspense>
  );
}
```

**ServerPostalCodesView** (Server Component):
```tsx
export default async function ServerPostalCodesView({ areaId }) {
  // Initiate all fetches as promises
  const postalCodesDataPromise = getPostalCodesDataForGranularity(granularity);
  const layersPromise = getLayers(areaId);
  const versionsPromise = getVersions(areaId);

  // Pass promises down - don't await here!
  return (
    <PostalCodesViewClient
      postalCodesDataPromise={postalCodesDataPromise}
      layersPromise={layersPromise}
      versionsPromise={versionsPromise}
    />
  );
}
```

**PostalCodesViewClient** (Client Component):
```tsx
"use client";

export function PostalCodesViewClient({
  postalCodesDataPromise,
  layersPromise,
  versionsPromise,
}) {
  // use() hook consumes promises where needed
  const postalCodesData = use(postalCodesDataPromise);
  const layers = use(layersPromise);
  const versions = use(versionsPromise);

  return <Map data={postalCodesData} layers={layers} />;
}
```

### Example 3: Header → VersionIndicator

**SiteHeader** (Server Component):
```tsx
export function SiteHeader({ areaId }) {
  return (
    <header>
      <h1>Gebietsmanagement</h1>
      <Suspense fallback={null}>
        {/* VersionIndicator fetches its own data */}
        <VersionIndicator areaId={areaId} />
      </Suspense>
    </header>
  );
}
```

**VersionIndicator** (Server Component):
```tsx
export async function VersionIndicator({ areaId }) {
  if (!areaId) return null;

  // Fetch here where it's used
  // Deduplication ensures efficiency if area fetched elsewhere
  const area = await getAreaById(areaId);
  const versionInfo = await getVersionIndicatorInfo(areaId, area.currentVersionNumber);

  return <Badge>{versionInfo.versionNumber}</Badge>;
}
```

## Files Modified

### Core Components

#### 1. `/app/(map)/layout.tsx`
- **Before**: Fetched areas and passed to AppSidebar
- **After**: Renders AppSidebar, lets it handle its own data

#### 2. `/components/app-sidebar.tsx`
- **Before**: Client component accepting data
- **After**: Server wrapper that delegates to client component

#### 3. `/components/app-sidebar-client.tsx`
- **New**: Client component with interactivity
- Uses NavAreasServer which fetches data

#### 4. `/components/areas/nav-areas-server.tsx`
- **Before**: Awaited areas before passing
- **After**: Passes promise to NavAreas

#### 5. `/components/areas/nav-areas.tsx`
- **Before**: Accepted data as prop
- **After**: Accepts promise, uses `use()` hook

#### 6. `/components/postal-codes/server-postal-codes-view.tsx`
- **Before**: Awaited all data in parallel
- **After**: Creates promises and passes them down

#### 7. `/components/postal-codes/postal-codes-view-client-layers.tsx`
- **Before**: Accepted awaited data
- **After**: Accepts promises, uses `use()` for each

#### 8. `/components/shared/version-indicator.tsx`
- **Before**: Same as after (already correct)
- **After**: Fetches its own data based on areaId

## Deduplication in Action

### How It Works

When you call the same data function multiple times:

```tsx
// Component A
const area = await getAreaById(1);

// Component B (sibling or child)
const area = await getAreaById(1);

// Only ONE database call is made!
```

This works because:
1. Next.js memoizes requests during render
2. Functions use `'use cache'` directive
3. `unstable_cacheTag` manages cache keys

### Real Example in Our App

```tsx
// ServerPostalCodesView
const areaPromise = getAreaById(areaId);
const layersPromise = getLayers(areaId);

// VersionIndicator (rendered in header)
const area = await getAreaById(areaId); // Same areaId!

// NavAreas (rendered in sidebar)
const areas = await getAreas(); // Used in multiple places!

// Result: Each unique request made only ONCE
```

## Rules and Guidelines

### When to Use Promises + use()

✅ **Use when:**
- Passing data from Server Component to Client Component
- Client Component needs interactivity (hooks, events)
- Want granular Suspense boundaries
- Multiple pieces of data with different loading speeds

❌ **Don't use when:**
- Server Component passing to Server Component (just await)
- Component doesn't need to be client
- Data is small and loads quickly

### Server Component Data Fetching

```tsx
// ✅ Correct: Fetch where used
export async function MyServerComponent({ id }) {
  const data = await fetchData(id);
  return <div>{data.name}</div>;
}

// ❌ Wrong: Fetching too early in parent
export async function ParentComponent({ id }) {
  const data = await fetchData(id);
  return <MyServerComponent data={data} />;
}
```

### Client Component Data Consumption

```tsx
// ✅ Correct: use() hook for promises
"use client";
export function MyClientComponent({ dataPromise }) {
  const data = use(dataPromise);
  return <div onClick={...}>{data.name}</div>;
}

// ❌ Wrong: Trying to await in client component
"use client";
export async function MyClientComponent({ dataPromise }) {
  const data = await dataPromise; // Error!
  return <div>{data.name}</div>;
}
```

## Suspense Boundaries

Every async operation should have a Suspense boundary:

```tsx
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### Granular Boundaries

```tsx
// ✅ Better: Granular boundaries
<div>
  <Suspense fallback={<HeaderSkeleton />}>
    <Header />
  </Suspense>

  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>

  <Suspense fallback={<ContentSkeleton />}>
    <Content />
  </Suspense>
</div>

// ❌ Worse: Single boundary
<Suspense fallback={<FullPageSkeleton />}>
  <div>
    <Header />
    <Sidebar />
    <Content />
  </div>
</Suspense>
```

## Performance Benefits

### Before: Sequential Waterfalls
```
Page awaits area (100ms)
  ↓
View awaits layers (150ms)
  ↓
Map awaits postal codes (200ms)
  ↓
Total: 450ms
```

### After: Parallel with Streaming
```
Page renders immediately
├─ Area fetch (100ms) ─┐
├─ Layers fetch (150ms) ┼─→ Suspense resolves as ready
└─ Postal codes (200ms) ┘
Total: 200ms (longest request)
```

## Testing Deduplication

To verify deduplication is working:

1. **Add logging to data functions:**
```tsx
export async function getAreas() {
  console.log('🔍 Fetching areas...');
  // ... fetch logic
}
```

2. **Check console during render:**
- Should see "Fetching areas..." ONCE even if called multiple times
- Multiple calls = working deduplication

3. **Check Network tab:**
- Should see single database query per unique request
- No duplicate requests

## Migration Checklist

✅ Remove early data fetching from layouts/pages
✅ Create promises in Server Components
✅ Pass promises to Client Components
✅ Use `use()` hook in Client Components
✅ Wrap async components in Suspense
✅ Trust deduplication for efficiency
✅ Test that data loads correctly
✅ Verify no duplicate requests

## Common Patterns

### Pattern 1: ID → Component Fetches
```tsx
// Pass ID down, let component fetch
<MyComponent userId={123} />

// Component fetches its own data
async function MyComponent({ userId }) {
  const user = await getUser(userId);
  return <div>{user.name}</div>;
}
```

### Pattern 2: Promise → use() → Render
```tsx
// Server: Create promise
async function ServerComp() {
  const dataPromise = fetchData();
  return <ClientComp dataPromise={dataPromise} />;
}

// Client: Consume promise
"use client";
function ClientComp({ dataPromise }) {
  const data = use(dataPromise);
  return <div>{data}</div>;
}
```

### Pattern 3: Multiple Promises
```tsx
// Server: Multiple promises
async function ServerComp() {
  const userPromise = getUser();
  const postsPromise = getPosts();
  const commentsPromise = getComments();

  return <ClientComp
    userPromise={userPromise}
    postsPromise={postsPromise}
    commentsPromise={commentsPromise}
  />;
}

// Client: Consume as needed
"use client";
function ClientComp({ userPromise, postsPromise, commentsPromise }) {
  const user = use(userPromise);
  const posts = use(postsPromise);
  const comments = use(commentsPromise);
  // All load in parallel!
}
```

## Conclusion

The push-down pattern maximizes React and Next.js capabilities:
- **Automatic deduplication** eliminates worry about duplicate requests
- **Parallel loading** happens naturally
- **Streaming** provides instant feedback
- **Self-contained components** improve maintainability
- **Optimal performance** without manual optimization

**Remember**: Fetch data where it's used, pass promises down, and trust the framework to handle the rest.
