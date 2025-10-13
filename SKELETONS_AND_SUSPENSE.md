# Skeletons & Suspense Boundaries - Complete Implementation

## Overview

This document describes the comprehensive skeleton and Suspense boundary implementation throughout the application, matching exact component structures for optimal loading states.

## Skeleton Components

### Location: `src/components/ui/loading-skeleton.tsx`

#### SidebarSkeleton
Matches the exact structure of `AppSidebarClient` component:
- Sidebar header with logo and title skeleton
- Nav Main section with menu items
- Nav Areas section with multiple area items (3 placeholder items)
- Proper spacing and dimensions matching actual sidebar

```tsx
<SidebarSkeleton />
```

**Used in:**
- `src/app/(map)/layout.tsx` - Main layout Suspense fallback

#### VersionIndicatorSkeleton
Matches `VersionIndicator` component structure:
- Badge-shaped skeleton for version info
- Proper dimensions for header display

```tsx
<VersionIndicatorSkeleton />
```

**Used in:**
- `src/components/site-header.tsx` - Header Suspense fallback

#### SiteHeaderSkeleton
Complete header skeleton matching `SiteHeader`:
- Sidebar trigger button skeleton
- Vertical separator
- Title skeleton
- Version indicator skeleton

```tsx
<SiteHeaderSkeleton />
```

**Used in:**
- `src/app/(map)/postal-codes/[areaId]/page.tsx` - Page header fallback

---

### Location: `src/components/ui/loading-skeletons.tsx`

#### HomePageSkeleton
Matches `PostalCodesOverview` component structure exactly:
- Page header with title and description
- Three feature cards in responsive grid (md:grid-cols-2 lg:grid-cols-3)
  - Each card has icon, title, description, and bullet list
- Getting started card with 3-step guide
  - Numbered circles (1, 2, 3)
  - Step titles and descriptions

```tsx
<HomePageSkeleton />
```

**Used in:**
- `src/app/(map)/page.tsx` - Home page Suspense fallback

#### PostalCodesViewSkeleton
Complex skeleton matching full postal codes view:

**Main Controls Bar:**
- Granularity selector dropdown (h-10 w-40)
- Layer selector dropdown (h-10 w-48)
- Action buttons group (undo, redo, version history, save)

**Left Sidebar:**
- Address Search Card
  - Header with icon and title
  - Input field (h-10)
  - Action buttons (2 buttons)
- Drawing Tools Card
  - Header with icon, title, and toggle
  - 4 tool buttons in 2x2 grid
  - Search tools section (2 buttons)
  - Statistics section (3 rows)

**Right Sidebar:**
- Layer Management Card
  - Header with icon, title, and add button
  - 3 layer items with checkbox, name, and menu

**Map Area:**
- Full-height map placeholder
- Centered loading text

```tsx
<PostalCodesViewSkeleton />
```

**Used in:**
- `src/app/(map)/postal-codes/[areaId]/page.tsx` - Main view fallback
- `src/components/postal-codes/server-postal-codes-view.tsx` - Component fallback

#### MapSkeleton
Animated map loading skeleton:
- Gradient background with pulse animation
- Simulated map tiles grid (4x4 = 16 tiles)
- Each tile animates with staggered delay
- Centered loading text with backdrop blur

```tsx
<MapSkeleton />
```

**Used in:**
- Map component fallbacks throughout the application

#### DrawingToolsSkeleton
Matches DrawingTools component:
- Card header with icon, title, and collapse button
- Tool buttons grid (2x2)
- Action buttons section (2 buttons)
- Statistics section with 3 labeled values

```tsx
<DrawingToolsSkeleton />
```

**Can be used for:**
- Individual drawing tools panel loading

#### AddressAutocompleteSkeleton
Matches AddressAutocomplete component:
- Card header with icon and title
- Search input field
- Two action buttons
- Additional info section (2 lines)

```tsx
<AddressAutocompleteSkeleton />
```

**Can be used for:**
- Address search component loading

## Suspense Boundaries

### Application-Wide Boundaries

#### 1. Root Layout - `src/app/(map)/layout.tsx`

```tsx
<Suspense fallback={<SidebarSkeleton />}>
  <AppSidebar variant="inset" />
</Suspense>
```

**Purpose:** Prevents entire app blocking while sidebar data loads
**Benefits:**
- Sidebar can stream in after page content
- Areas list loads independently

---

#### 2. Page Level - `src/app/(map)/page.tsx`

```tsx
<Suspense fallback={<HomePageSkeleton />}>
  <PostalCodesOverview />
</Suspense>
```

**Purpose:** Home page with proper loading state
**Benefits:**
- Immediate skeleton display matching exact layout
- No layout shift when content loads

---

#### 3. Postal Codes Page - `src/app/(map)/postal-codes/[areaId]/page.tsx`

```tsx
{/* Header with version info */}
<Suspense fallback={<SiteHeaderSkeleton />}>
  <SiteHeader areaId={areaId} />
</Suspense>

{/* Main content */}
<Suspense fallback={<PostalCodesViewSkeleton />}>
  <ServerPostalCodesView
    defaultGranularity={granularity}
    areaId={areaId}
    versionId={versionId!}
  />
</Suspense>
```

**Purpose:** Separate streaming for header and main content
**Benefits:**
- Header can load independently
- Version info streams separately
- Main view has comprehensive skeleton

---

#### 4. Site Header - `src/components/site-header.tsx`

```tsx
<Suspense fallback={<VersionIndicatorSkeleton />}>
  <VersionIndicator areaId={areaId} />
</Suspense>
```

**Purpose:** Version indicator loads independently
**Benefits:**
- Header renders immediately
- Version badge streams in separately

---

#### 5. Sidebar Components - `src/components/app-sidebar-client.tsx`

```tsx
<Suspense fallback={<NavAreasLoading />}>
  <NavAreas
    areasPromise={areasPromise}
    isLoading={false}
    currentAreaId={currentAreaId}
    onAreaSelect={onAreaSelect}
  />
</Suspense>
```

**Purpose:** Areas list loads independently within sidebar
**Benefits:**
- Sidebar structure appears immediately
- Areas list streams in with detailed skeleton

---

## Implementation Patterns

### Pattern 1: Page-Level Suspense
```tsx
export default async function MyPage() {
  return (
    <Suspense fallback={<MyPageSkeleton />}>
      <MyPageContent />
    </Suspense>
  );
}
```

### Pattern 2: Component-Level Suspense
```tsx
export function MyComponent() {
  return (
    <div>
      <div>Static content here</div>
      <Suspense fallback={<MyComponentSkeleton />}>
        <AsyncComponent />
      </Suspense>
    </div>
  );
}
```

### Pattern 3: Nested Suspense Boundaries
```tsx
export default async function Page() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <Suspense fallback={<MainContentSkeleton />}>
        <MainContent>
          <Suspense fallback={<WidgetSkeleton />}>
            <Widget />
          </Suspense>
        </MainContent>
      </Suspense>
    </>
  );
}
```

---

## Skeleton Design Principles

### 1. **Exact Structural Match**
Every skeleton component matches its real component's structure exactly:
- Same container structure (Card, div, etc.)
- Same spacing and padding
- Same grid/flex layout
- Same number of elements

### 2. **Visual Consistency**
Skeletons use shadcn's `Skeleton` component:
- Consistent animation (`animate-pulse`)
- Consistent background (`bg-accent`)
- Rounded corners matching actual components

### 3. **Dimension Accuracy**
Size classes match actual content:
- Headers: `h-5` or `h-6`
- Body text: `h-4`
- Buttons: `h-9` or `h-10`
- Inputs: `h-10`
- Icons: `w-4 h-4` or `w-5 h-5`

### 4. **Responsive Behavior**
Skeletons respond to breakpoints like real components:
- Mobile: Single column
- Tablet: `md:grid-cols-2`
- Desktop: `lg:grid-cols-3`

### 5. **Loading Indicators**
Complex skeletons include context:
```tsx
<div className="text-center">
  <Skeleton className="h-6 w-32 mx-auto" /> {/* "Loading..." */}
  <Skeleton className="h-4 w-48 mx-auto" /> {/* "Please wait" */}
</div>
```

---

## Performance Benefits

### 1. **Streaming SSR**
- Server can start sending HTML immediately
- Suspense boundaries enable progressive rendering
- Users see structured layout before data arrives

### 2. **Perceived Performance**
- Skeletons reduce perceived loading time
- Users understand what's loading
- No jarring layout shifts

### 3. **Parallel Loading**
Multiple Suspense boundaries allow:
- Header loads while sidebar loads
- Areas list loads while page content loads
- Version info loads independently

### 4. **Partial Pre-rendering (PPR)**
With `experimental_ppr = true`:
- Static parts pre-render at build time
- Dynamic parts (inside Suspense) stream at runtime
- Best of both worlds

---

## Testing Checklist

### Visual Testing
- [ ] All skeletons match component structure
- [ ] No layout shift when real content loads
- [ ] Animations are smooth (pulse, not jarring)
- [ ] Responsive behavior matches real components

### Functional Testing
- [ ] Suspense fallbacks display correctly
- [ ] Components stream in properly
- [ ] No hydration errors
- [ ] Error boundaries work with Suspense

### Performance Testing
- [ ] Initial load shows skeleton immediately
- [ ] Streaming happens in correct order
- [ ] No waterfall loading issues
- [ ] Parallel loading works as expected

---

## Future Enhancements

### 1. **More Granular Skeletons**
- Individual layer item skeleton
- Single postal code entry skeleton
- Map control panel skeleton

### 2. **Animated Skeletons**
- Wave animation across skeleton
- Shimmer effect
- Progressive reveal

### 3. **Smart Skeletons**
- Remember last loaded content dimensions
- Adaptive skeleton based on data size
- Context-aware skeleton variations

### 4. **Loading States**
- Progress indicators for long operations
- Percentage-based loading bars
- Time estimates for data fetching

---

## Summary

✅ **Complete skeleton coverage** for all major components
✅ **Strategic Suspense boundaries** at page, section, and component levels
✅ **Exact structural matching** ensures no layout shift
✅ **Responsive design** matches breakpoint behavior
✅ **Performance optimized** with streaming and parallel loading
✅ **User experience enhanced** with detailed, accurate loading states

The implementation follows Next.js 15 best practices for streaming, uses React 19's Suspense capabilities effectively, and provides a polished, professional loading experience throughout the application.
