# Copilot Instructions for KRAUSS Territory Management

## Project Overview

- **Stack:** Next.js 15 (App Router, Parallel Routing, Partial Prerendering), TypeScript (type imports, strict), Shadcn UI, Tailwind CSS v4, Bun, Drizzle ORM, React 19 (with React Compiler), nuqs for URL state, Zod for validation, next-themes, Radix UI, class-variance-authority/clsx/tailwind-merge for class management.
- **Purpose:** Professional territory management and visualization for Germany, with interactive mapping and real-time analysis.

## Architecture & Key Patterns

- **App Structure:**
  - `src/app/` uses the Next.js App Router. Each subfolder is a page route (e.g., `map/`, `api/`). Use parallel routing (`@folders`) for complex flows.
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
  - Start: `bun dev` (preferred)
  - Always use `bun` for package management and scripts.
  - Use `bun run` for scripts (e.g., `bun run build`, `bun run lint`).
  - Use `bun run format` for formatting (Prettier).
  - Use `bun run lint` for linting (ESLint).
  - Use `bunx` for running scripts in the project (e.g., `bunx next dev`).
- **Build:**
  - Build: `bun run build` (outputs to `.next/`).
  - Use `bun run start` to run the production build.
- **Linting/Formatting:**
  - Use ESLint with Prettier integration. Run `bun run lint` to check code quality.
  - Use `bun run format` to format code with Prettier.
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
- Leave NO todo's, placeholders or missing pieces.
- ALWAYS use relative imports (e.g., `import { Button } from '@/components/ui/button'`).
- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- **Clean Code:** Prioritize **readability, maintainability, and reusability**.
- **Conciseness:** Aim for concise and expressive code.
- **Descriptive Naming:** Use clear and descriptive names for variables, functions, components, and files (e.g., `getUserProfile`, `ProductCard`, `useAuth`).
- **DRY (Don't Repeat Yourself):** Extract reusable logic into functions, custom hooks, or components.
- **Modularization:** ALWAYS Break down complex problems and features into smaller, manageable units (components, functions, utilities).
- **Package Management:** This project uses **bun** for managing dependencies. All package installations and scripts should use `bun` instead of `npm` or `yarn`.

- **Local State:** Use `useState` for component-level state.
- **Global State:** For global or shared state, prefer **React Context API** or a dedicated state management library (e.g., preferiably NUQS or then Zustand, Redux, Jotai). Avoid prop drilling.
- **Keys:** Always provide a unique and stable `key` prop when mapping over lists. Do not use array `index` as a key if the list can change.
- **Lazy Loading:** Suggest `React.lazy` and `Suspense` for code splitting large components or routes.
- **Consistent Approach:** use Tailwind CSS v4 ou later.
- **Scoped Styles:** Ensure styles are scoped to avoid global conflicts.
- **Immutability:** Never mutate props or state directly. Always create new objects or arrays for updates.
- **Fragments:** Use `<>...</>` or `React.Fragment` to avoid unnecessary DOM wrapper elements.
- **Custom Hooks:** Extract reusable stateful logic into **custom hooks** (e.g., `useDebounce`, `useLocalStorage`).
- **UI Components:** Use [shadcn/ui](https://ui.shadcn.com/) for building UI components to ensure consistency and accessibility.
- **Single Responsibility:** Each component should ideally have one primary responsibility. **Components should be kept small and focused.**

### TypeScript

- **Strict Mode:** Ensure `strict: true` is enabled in `tsconfig.json`.
- **Type Definitions:** Provide accurate type definitions for API responses, props, and state.
- **Type Organization:** When generating TypeScript types or interfaces in this project, always place them in the `types/` folder with a descriptive filename (e.g. `user.ts`, `post.ts`). Do not define types or interfaces inside components.

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

# Project Structure And App Router

- Use the App Router (`app` directory) in Next.js 15
- Co-locate route handlers, loading and error states, and page-level components within the `app` directory
- Use route groups (parentheses) to organize without affecting URLs
- Use parallel or intercepting routes for complex layouts and modals
- Place API route handlers in `app/api`

# Server Components

- Default to Server Components for data fetching and rendering
- Keep them free of client-side hooks or browser APIs
- Use `Suspense` boundaries for streaming and granular loading states
- Use `generateMetadata` in `layout.tsx` or `page.tsx` for dynamic SEO metadata
- Prefer `fetch` with `revalidate` options for caching in Server Components
- Implement `generateStaticParams` for static builds of dynamic routes
- Use `unstable_noStore` for fully dynamic, non-cached rendering
- Use `Promise.all` for parallel data fetching and `React.cache` for request deduplication

# Client Components

- Mark Client Components with `"use client"` at the top
- Use `next/navigation` hooks such as `useRouter` and `usePathname` instead of `next/router`
- Handle form state with `useFormStatus`, `useFormState`, and `useOptimistic` when using Server Actions
- Include client-specific logic like user interaction and browser APIs here

# Data Fetching

- Use the built-in `fetch` in Server Components for data retrieval
- Pass caching strategies with `fetch(url, { next: { revalidate: <seconds> } })`
- Keep external requests minimal if deploying to serverless environments
- Avoid fetching in Client Components if it can be done on the server

# Route Handlers

- Replace deprecated `pages/api` routes with Route Handlers under `app/api`
- `GET` handlers are static by default unless otherwise configured
- Validate incoming data and use proper CORS or security measures
- Support JSON, text, and other file responses

# Server Actions

- Define Server Actions with the `use server` directive
- Call them from both Server and Client Components for data mutations
- Use `useFormStatus` and `useFormState` in Client Components to track form submissions
- Use `useOptimistic` to update the UI optimistically before server confirmation

# Middleware And Edge Runtime

- Use `middleware.ts` for route interception, authentication, redirects, and rewrites
- Use the Edge Runtime for faster startup and location-based personalization
- Handle cookies, headers, and dynamic rewrites in `middleware`
- Be mindful of constraints when running at the edge

# Styling And Assets

- Use CSS Modules, Tailwind CSS, or CSS-in-JS solutions
- Use the built-in `<Image />` component for optimized images
- Consider built-in font optimization with `@next/font` or newer APIs

# Performance

- Use streaming and `Suspense` for faster initial rendering
- Dynamically import large dependencies in Client Components
- Use `React.useMemo` and `React.useCallback` in Client Components to avoid re-renders
- Use `fetch` caching and revalidation carefully

# Deployment

- Use Vercel for integrated features or self-host with Node or Docker
- Test SSR and static outputs thoroughly
- Keep environment variables secure, never expose private values on the client

# Testing And Linting

- Use `next lint` with ESLint and integrate Prettier
- Use Jest, React Testing Library, or Cypress for testing
- Keep test files near related components

# Dos

- Do organize routes and components in the `app` directory
- Do leverage Server Components for data fetching
- Do use Server Actions for form submissions
- Do use `next/link` for internal routing and prefetching
- Do implement loading states with `loading` files
- Do optimize images with the `<Image />` component
- Do separate server and client logic carefully

# Donts

- Dont mix the `pages` and `app` directories for routing
- Dont fetch data in Client Components if it can be done on the server
- Dont use `router.push` for form submissions when Server Actions are available
- Never expose sensitive environment variables in client code
- Dont import client-only modules into Server Components
- Avoid using `next/router` in App Router projects

Copy

Cursor

GH Copilot

Windsurf

Cline
.cursor/rules

rule-next-coding-standards.md
Add prompts as project rules inside the .cursor/rules/ directory (e.g., .cursor/rules/cursorrules.mdc). Cursor will automatically detect and apply them. For detailed guidance, refer to the official Cursor rule guide.
Details

Comprehensive rules and best practices for Next.js 15 development, covering project structure, TypeScript usage, and more

Tags
Architecture
Preferred Models
Reasoning
Chat
AI Editors
Cursor
117
34
Rule
Updated 4 weeks ago
Get Proven AI Skills
for Profitable Projects

Instructa Pro helps you to become confident with AI and use it in real-world projects.

Get All-Access today



---

For more, see `README.md` and explore `src/components/` and `src/lib/` for patterns.
