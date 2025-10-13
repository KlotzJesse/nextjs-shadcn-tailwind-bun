# Server-Client Boundary Fix

## Problem

The application was failing with errors about `'server-only'` imports being pulled into Client Components:

```
Invalid import
'server-only' cannot be imported from a Client Component module.
```

The error chain was:
```
./src/lib/db/data-functions.ts [Server-only code with 'use cache']
  ↓
./src/components/areas/nav-areas-server.tsx [Imports getAreas()]
  ↓
./src/components/app-sidebar-client.tsx [Client Component - "use client"]
  ↓
./src/components/app-sidebar.tsx [Server Component]
```

## Root Cause

`NavAreasServer` was importing `getAreas()` from `data-functions.ts` (which contains server-only code), but `NavAreasServer` itself was being imported by `AppSidebarClient` (a Client Component). This caused Next.js to try to bundle server-only code (database imports, `'use cache'`, `'server-only'`) into the client bundle, which is not allowed.

## Solution

**Move data fetching above the Client Component boundary.**

The fix follows the pattern documented in Next.js:
- Fetch data in Server Component
- Pass promise through Client Component props
- Consume promise with `use()` hook in nested Client Component

### Changes Made

#### 1. `app-sidebar.tsx` (Server Component)
- ✅ Now fetches areas data: `const areasPromise = getAreas()`
- ✅ Passes promise to client: `<AppSidebarClient areasPromise={areasPromise} />`
- ✅ Keeps server-only imports above client boundary

#### 2. `app-sidebar-client.tsx` (Client Component)
- ✅ Accepts `areasPromise` prop: `areasPromise: Promise<Area[]>`
- ✅ No longer imports `NavAreasServer` (which imported server code)
- ✅ Directly uses `NavAreas` with promise
- ✅ Wraps in Suspense with loading fallback

#### 3. `nav-areas-server.tsx`
- ℹ️ No longer needed in this flow, but kept for potential other uses
- ℹ️ Could be deleted if not used elsewhere

## Data Flow Pattern

```tsx
// SERVER COMPONENT (app-sidebar.tsx)
export async function AppSidebar(props) {
  const areasPromise = getAreas(); // ← Server-only code stays here
  return <AppSidebarClient areasPromise={areasPromise} {...props} />;
}

// CLIENT COMPONENT (app-sidebar-client.tsx)
export function AppSidebarClient({ areasPromise, ...props }) {
  return (
    <Suspense fallback={<NavAreasLoading />}>
      <NavAreas areasPromise={areasPromise} /> {/* ← Promise passed through */}
    </Suspense>
  );
}

// CLIENT COMPONENT (nav-areas.tsx)
export function NavAreas({ areasPromise }) {
  const areas = use(areasPromise); // ← Promise consumed with use()
  // ... render with areas data
}
```

## Key Principles

### ✅ DO
- Fetch data in Server Components
- Pass promises through Client Components as props
- Consume promises with `use()` in Client Components
- Keep server-only imports (db, 'use cache', 'server-only') above client boundary

### ❌ DON'T
- Import server-only code in files that are imported by Client Components
- Try to use database code directly in Client Components
- Mix server-only imports with client interactivity in the same component

## Benefits

1. **Clear Separation**: Server code stays on server, client code on client
2. **Type Safety**: Promise types are properly typed through the chain
3. **Streaming**: Promise pattern enables React Suspense streaming
4. **Deduplication**: Next.js automatically deduplicates identical requests
5. **No Bundle Errors**: Server-only modules stay out of client bundle

## Verification

```bash
# Should compile without errors
bun run build

# Should run without errors
bun run dev
```

No more `'server-only'` import errors or `fs`, `dns`, `pg` module not found errors.
