# Copilot Instructions for KRAUSS Territory Management

## Project Overview

- **Stack:** Next.js 15 (App Router, Parallel Routing, Partial Prerendering), TypeScript (type imports, strict), Shadcn UI, Tailwind CSS v4, Bun, Drizzle ORM, React 19 (with React Compiler), nuqs for URL state, Zod for validation, next-themes, Radix UI, vlass/clsx/tailwind-merge for class management.
- **Purpose:** Professional territory management and visualization for Germany, with interactive mapping and real-time analysis.

## Architecture & Key Patterns

- **App Structure:**
  - `src/app/` uses the Next.js App Router. Each subfolder is a route (e.g., `map/`, `api/`). Use parallel routing (`@folders`) for complex flows.
  - `src/components/` contains UI and feature components, organized by domain (e.g., `postal-codes/`, `shared/`, `ui/`).
  - `src/lib/` holds utilities, hooks, DB logic (`db.ts`), and schema definitions (`schema/`).
- **Component Patterns:**
  - Always prefer **React Server Components** (server-first). Use client components only when needed (e.g., interactivity, state, effects).
  - Use `server-*.tsx` for server components. Use `use client` only when required.
  - Split components for **Single Responsibility Principle** and maintainability. Avoid unnecessary markup (no extra divs).
  - Use **Shadcn UI** and **Radix UI** primitives, avoid custom overrides unless necessary.
  - Use **vlass**, **clsx**, and **tailwind-merge** for className composition. No hardcoded classes; use variants and shared constants.
- **Performance & React 19:**
  - Use `React.memo`, `useMemo`, `useCallback` for all performance-sensitive components.
  - Use granular **Suspense** boundaries and `loading.tsx`/`error.tsx` in every route and subroute. Use loading skeletons from `ui/` for all async UI.
  - Use `react-errorboundary` for error boundaries.
  - Always use `next/dynamic` for non-critical or non-initial components (code splitting by default).
  - Never fetch in `useEffect`—fetch on server or with `use`/React 19 patterns.
- **State & URL:**
  - Use **nuqs** for all URL state/params. No custom URL parsing.
  - Use Zod for all validation (forms, API, DB input).
- **Database:**
  - Use Drizzle ORM. Config in `drizzle.config.ts`, schema in `src/lib/schema/`. Migrations in `/migrations/` (SQL files).
  - All DB access is via server components or server actions. Never expose DB logic to client.
- **Styling:**
  - Use Tailwind CSS v4. No custom CSS unless absolutely required. Use Shadcn UI for all primitives.
- **TypeScript:**
  - No `any` or `unknown`. Use type imports where possible. All code is TypeScript-first.
  - Shared types/constants in `src/lib/` or `src/components/shared/`.
- **Testing:**
  - No explicit test setup found—add tests in `src/` as needed, colocated with features.

## Developer Workflows

- **Development:**
  - Start: `bun dev` (preferred), or `npm|yarn|pnpm dev`.
  - Main entry: `src/app/page.tsx`.
- **Database:**
  - Edit schema in `src/lib/schema/`, run migrations manually (no auto-migrate script).
- **Component/Feature Additions:**
  - Add new map tool: extend `src/components/shared/drawing-tools.tsx` and update `base-map.tsx`.
  - Add new DB table: update `src/lib/schema/`, create a migration in `/migrations/`, and update `db.ts` if needed.

## Best Practices & Conventions

- **KISS:** Keep all components and hooks short, simple, and single-purpose.
- **No duplication:** Never duplicate code or logic. Extract shared code to `shared/` or `lib/`.
- **No hardcoding:** Use constants, enums, and shared config for all values.
- **Hooks:** Custom hooks in `src/lib/hooks/`, one concern per hook. Keep `useEffect` minimal and only for client-only concerns.
- **SRP:** Every component, hook, and utility should have a single responsibility.
- **One source of truth:** Centralize state, types, and constants.
- **Accessibility:** Use semantic HTML and accessible Shadcn/Radix primitives.
- **Loading/Error States:** Always provide perfect loading states (skeletons, spinners) and granular error boundaries.
- **Performance:** Use React 19 features, React Compiler, and all relevant memoization and code-splitting strategies.
- **Structure:** Continuously improve structure with reusable components, custom hooks, and utility functions. Avoid unnecessary markup and divs.

## Dos

- Organize routes/components in `app` directory
- Leverage Server Components for data fetching
- Use Server Actions for form submissions
- Use `next/link` for internal routing and prefetching
- Implement loading states with `loading.tsx`
- Optimize images with `<Image />`
- Separate server and client logic carefully

## Donts

- Don't mix `pages` and `app` directories for routing
- Don't fetch data in Client Components if it can be done on the server
- Don't use `router.push` for form submissions when Server Actions are available
- Never expose sensitive env variables in client code
- Don't import client-only modules into Server Components
- Avoid using `next/router` in App Router projects

## Integration & Communication

- **API routes:** Located in `src/app/api/` (Next.js API routes). Use Zod for input validation.
- **External:** No external API integrations found; all logic appears internal.

---

For more, see `README.md` and explore `src/components/` and `src/lib/` for patterns.
