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
- **Animation**: Framer Motion
- **Charts**: Recharts

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
- **Interactive SVG Turbine Diagram**: 4 clickable sections (Compressor, Mid Frame, Turbine, Exit Cylinder) with hover/selected states
- **Task Lifecycle**: draft → assigned → in_progress → paused → submitted → under_qc → approved/rejected
- **Time Tracking**: Start/pause/resume time entries per task with elapsed time display
- **QC Review Flow**: Approve/reject with mandatory comments for rejection; approved tasks are locked
- **Multi-step Create Task**: Step 1 selects turbine location via SVG + stage/component dropdowns, Step 2 fills task details
- **Dashboard**: Live task stats (Total, Pending, Completed, Overdue with pulsing alert), Tasks by Stage bar chart, Recent Activity
- **Task List**: Filterable list with priority color stripes, status badges, technician initials, hours, deadlines
- **Task Detail**: Full task view with time tracking panel, time entries history, QC panel, QC review history
- **Asset History**: Component maintenance history organized by section/stage tabs

### Pages & Routes
- `/` — Dashboard with KPI cards, turbine diagram, charts
- `/tasks` — Task list with filter dropdown
- `/tasks/:id` — Task detail with time tracking and QC panel
- `/create-task` — Multi-step task creation with SVG turbine selector
- `/history` — Asset component history

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
- `tasks` — main task entity with status/priority/deadline/timeEntries/qcReviews (TaskDetail response)
- `time_entries` — time tracking per task (start/end/duration/pauseReason)
- `qc_reviews` — QC approval/rejection records with reviewer name

### Seed Data
Run: `pnpm --filter @workspace/scripts run seed`
- 5 demo users (2 engineers, 3 technicians) — default userId=1 (Admin User/Site Manager)
- 1 SGT-9000HL asset with all sections, stages, and components
- 5 sample tasks at various status stages

### API Routes (v0.2)
- `GET /api/assets` — list assets
- `GET /api/assets/:id/sections` — list sections
- `GET /api/sections/:id/stages` — list stages
- `GET /api/stages/:id/components` — list components
- `GET /api/components/:id/history` — component maintenance history
- `GET /api/users` — list users
- `GET/POST /api/tasks` — list and create tasks
- `GET /api/tasks/:id` — get task with timeEntries and qcReviews (TaskDetail)
- `PATCH /api/tasks/:id/status` — update task status (locked when approved)
- `POST /api/tasks/:id/time` — start time tracking
- `POST /api/tasks/:id/time/pause` — pause (requires reason)
- `POST /api/tasks/:id/time/resume` — resume time tracking
- `GET /api/tasks/:id/time` — list time entries
- `POST /api/tasks/:id/qc` — submit QC review (approve/reject)
- `GET /api/tasks/:id/qc` — list QC reviews
- `GET /api/dashboard/stats` — aggregated stats by status/section/stage + technician performance

### UI Components (turbine-app)
- `src/components/TurbineDiagram.tsx` — SVG turbine selector with hover/selected states
- `src/components/layout/AppLayout.tsx` — sidebar + mobile bottom nav
- `src/components/ui/core.tsx` — Button, Card, Input, Badge, Label, Select, Textarea
- `src/pages/Dashboard.tsx` — overview with stats, charts, recent activity
- `src/pages/Tasks.tsx` — task list with priority stripes, animated cards
- `src/pages/TaskDetail.tsx` — full task view with time tracking and QC panel
- `src/pages/CreateTask.tsx` — multi-step form with turbine selector and real DB IDs
- `src/pages/AssetHistory.tsx` — component history with section/stage tabs

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation and `@workspace/db` for persistence.

### `artifacts/turbine-app` (`@workspace/turbine-app`)
React + Vite frontend. Dark industrial theme with blue/amber accent palette.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.
- Run migrations: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec (v0.2). Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks via Orval. Query hooks use `export function useXxx<...>()` pattern. Mutation hooks use `export const useXxx`.
