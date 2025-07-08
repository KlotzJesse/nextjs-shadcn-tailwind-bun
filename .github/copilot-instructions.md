# Copilot Instructions for KRAUSS Territory Management

## Project Overview

- **Stack:** Next.js (App Router), TypeScript, Shadcn UI, Tailwind CSS, Bun, Drizzle ORM
- **Purpose:** Professional territory management and visualization for Germany, with interactive mapping and real-time analysis.

## Architecture & Key Patterns

- **App Structure:**
  - `src/app/` uses the Next.js App Router. Each subfolder is a route (e.g., `map/`, `api/`).
  - `src/components/` contains UI and feature components, organized by domain (e.g., `postal-codes/`, `shared/`, `ui/`).
  - `src/lib/` holds utilities, hooks, DB logic (`db.ts`), and schema definitions (`schema/`).
- **Mapping:**
  - Map logic is in `src/components/shared/` (e.g., `base-map.tsx`, `drawing-tools.tsx`) and `src/components/postal-codes/`.
  - Server/client separation: `server-*.tsx` for server components, others for client.
- **Database:**
  - Uses Drizzle ORM. Config in `drizzle.config.ts`, schema in `src/lib/schema/`.
  - Migrations in `/migrations/` (SQL files).

## Developer Workflows

- **Development:**
  - Start: `bun dev` (preferred), or `npm|yarn|pnpm dev`.
  - Main entry: `src/app/page.tsx`.
- **Database:**
  - Edit schema in `src/lib/schema/`, run migrations manually (no auto-migrate script).
- **Styling:**
  - Use Tailwind CSS and Shadcn UI components from `src/components/ui/`.
- **Testing:**
  - No explicit test setup found—add tests in `src/` as needed.

## Project Conventions

- **Component Organization:**
  - Domain-specific components in their own folders (e.g., `postal-codes/`).
  - Shared logic in `shared/` and `lib/hooks/`.
- **Naming:**
  - Use `server-` prefix for server components.
  - UI primitives in `ui/`.
- **TypeScript:**
  - All code is TypeScript-first.

## Integration & Communication

- **API routes:**
  - Located in `src/app/api/` (Next.js API routes).
- **External:**
  - No external API integrations found; all logic appears internal.

## Examples

- To add a new map tool: extend `src/components/shared/drawing-tools.tsx` and update `base-map.tsx`.
- To add a new DB table: update `src/lib/schema/`, create a migration in `/migrations/`, and update `db.ts` if needed.

---

For more, see `README.md` and explore `src/components/` and `src/lib/` for patterns.
