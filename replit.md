# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **State/Data fetching**: TanStack React Query (via generated hooks)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── turbine-app/        # Maintenance Task & QC Management System (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Application: Maintenance Task & QC Management System

### Key Features
- **Interactive SVG Turbine Diagram**: 4 clickable sections (Compressor, Mid Frame, Turbine, Exit Cylinder)
- **Task Management**: Full CRUD with status flow (Draft → Approved/Rejected)
- **Multi-step Create Task**: Step 1 selects turbine location via SVG, Step 2 fills task details
- **Dashboard**: Live task stats, task distribution bar chart, recent activity feed
- **Task List**: Filterable list with color-coded status badges

### Turbine Sections
- Compressor (steel blue) — left, trapezoid, widest
- Mid Frame (amber/orange) — center, rectangular combustion section
- Turbine (emerald/teal) — center-right, with 4 stages (80-100, 70-90, 60-80, 50-70 blades)
- Turbine Exit Cylinder (purple) — right, expanding diffuser

### Database Schema (Drizzle + PostgreSQL)
- `users` — roles: engineer, supervisor, site_manager, technician
- `assets` — gas turbine assets (SGT-9000HL)
- `asset_sections` — turbine sections per asset
- `asset_stages` — stages within sections (blade counts)
- `asset_components` — components within stages
- `tasks` — main task entity with status/priority/deadline
- `time_entries` — time tracking per task
- `qc_reviews` — QC approval/rejection records

### Seed Data
Run: `pnpm --filter @workspace/scripts run seed`
- 5 demo users (2 engineers, 3 technicians)
- 1 SGT-9000HL asset with all sections, stages, and components
- 5 sample tasks at various status stages

### API Routes
- `GET /api/assets` — list assets
- `GET /api/assets/:id/sections` — list sections
- `GET /api/sections/:id/stages` — list stages
- `GET /api/stages/:id/components` — list components
- `GET/POST /api/tasks` — list and create tasks
- `GET/PATCH /api/tasks/:id` — get and update task status
- `GET /api/users` — list users

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation and `@workspace/db` for persistence.

### `artifacts/turbine-app` (`@workspace/turbine-app`)
React + Vite frontend. Dark industrial theme. Key components:
- `src/components/TurbineDiagram.tsx` — SVG turbine selector
- `src/pages/Dashboard.tsx` — overview with stats
- `src/pages/Tasks.tsx` — task list
- `src/pages/CreateTask.tsx` — multi-step task creation

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.
- Run migrations: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
