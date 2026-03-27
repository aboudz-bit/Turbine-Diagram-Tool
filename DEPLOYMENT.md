# Turbine QC — Deployment & Handoff Guide

## Architecture Overview

pnpm monorepo with two deployable artifacts:

| Component | Stack | Port |
|-----------|-------|------|
| **API Server** | Express 5, Drizzle ORM, PostgreSQL | `PORT` env var |
| **Frontend** | React 19, Vite 7, TanStack Query | `PORT` env var (separate) |

Shared libraries in `lib/`:
- `@workspace/db` — Drizzle schema + connection
- `@workspace/api-zod` — Generated Zod validators from OpenAPI
- `@workspace/api-client-react` — Generated React Query hooks from OpenAPI
- `@workspace/api-spec` — OpenAPI 3.1 spec (source of truth)

---

## Environment Variables

### API Server (required)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | Yes | — | API server listen port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | **Production: Yes** | `turbine-qc-dev-secret` | Must set a strong secret (32+ chars) in production |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | No | `info` | Pino log level (debug/info/warn/error) |
| `NODE_ENV` | No | `development` | Set `production` for production |

### Frontend

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | Yes | — | Dev/preview server port |
| `BASE_PATH` | Yes | — | Base URL path (e.g., `/` or `/turbine/`) |

---

## Database Setup

### 1. Provision PostgreSQL

```bash
# Create database and user
psql -U postgres -c "CREATE DATABASE turbine_qc;"
psql -U postgres -c "CREATE USER turbine WITH PASSWORD '<strong-password>';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE turbine_qc TO turbine;"
psql -U postgres -d turbine_qc -c "GRANT ALL ON SCHEMA public TO turbine;"
```

### 2. Push Schema

```bash
DATABASE_URL="postgresql://turbine:<password>@localhost:5432/turbine_qc" \
  pnpm --filter @workspace/db run push
```

### 3. Seed Demo Data

```bash
DATABASE_URL="postgresql://turbine:<password>@localhost:5432/turbine_qc" \
  pnpm --filter @workspace/scripts run seed
```

This creates 5 users, 1 turbine asset with sections/stages/components, and 5 sample tasks. The seed is idempotent (won't duplicate on re-run).

### DB Migration Notes

- Uses `drizzle-kit push` (not migration files). Schema changes are applied directly.
- For production schema changes: use `push` (safe) or `push-force` (destructive, drops columns).
- The `revision_needed` status and `version` column were added in this hardening phase.

---

## Local Development

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- PostgreSQL >= 15

### Setup

```bash
# Install dependencies
pnpm install

# Set up database (see Database Setup above)

# Start API server
PORT=5000 \
DATABASE_URL="postgresql://turbine:password@localhost:5432/turbine_qc" \
  pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
PORT=5173 BASE_PATH=/ \
  pnpm --filter @workspace/turbine-app run dev
```

### Build

```bash
# Full workspace build (typecheck + compile)
pnpm run build

# Or individually:
pnpm --filter @workspace/api-server run build     # Outputs dist/index.mjs
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/turbine-app run build  # Outputs dist/public/
```

### Run Tests

```bash
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/turbine_test" \
  pnpm --filter @workspace/api-server run test
```

30 integration tests covering auth, task CRUD, status transitions, time tracking, and QC workflows.

---

## Production Deployment

### API Server

```bash
# Build
pnpm --filter @workspace/api-server run build

# Run
PORT=5000 \
DATABASE_URL="postgresql://..." \
JWT_SECRET="<random-32-char-string>" \
CORS_ORIGINS="https://your-domain.com" \
NODE_ENV=production \
  node --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

The API server is a single bundled ESM file (`dist/index.mjs`) with no runtime dependencies on `node_modules`.

### Frontend

```bash
# Build static assets
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/turbine-app run build

# Serve dist/public/ via any static file server (nginx, Caddy, S3+CloudFront)
```

The frontend build produces static HTML/CSS/JS in `artifacts/turbine-app/dist/public/`. Serve with any CDN or reverse proxy.

### Reverse Proxy Setup (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name turbine.example.com;

    # Frontend static files
    location / {
        root /path/to/artifacts/turbine-app/dist/public;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Known Limitations

1. **No password authentication** — Login is user-picker only (selects from seeded users). Fine for internal/UAT use. Add password hashing (bcrypt/argon2) for external deployment.

2. **JWT secret fallback** — The dev secret is hardcoded as fallback. Always set `JWT_SECRET` in production.

3. **No rate limiting** — API has no request rate limiting. Add `express-rate-limit` before public exposure.

4. **No file uploads** — No attachment/image support for tasks or QC reviews yet.

5. **Single-asset scope** — The UI is designed around a single turbine (SGT-9000HL). Multi-asset support exists in the data model but the dashboard/navigation assumes one asset.

6. **No email/notifications** — No alerting when tasks are assigned, overdue, or reviewed.

7. **Overdue detection is computed** — Overdue status is calculated at query time by comparing deadline vs. now. Not stored in DB. This means background jobs or push notifications for overdue alerts would need a separate mechanism.

8. **No audit log** — Status changes and QC decisions are tracked but there's no comprehensive audit trail table.

9. **Frontend pre-existing TS errors** — 10 TypeScript strict-mode errors exist in the frontend (queryKey patterns in generated hooks). These don't affect the build (Vite transpiles without type checking) but would fail `tsc --noEmit`.

---

## Codegen Pipeline

If the OpenAPI spec changes:

```bash
# 1. Edit the spec
vim lib/api-spec/openapi.yaml

# 2. Regenerate client + Zod
cd lib/api-spec && pnpm exec orval --config ./orval.config.ts

# 3. Rebuild declarations
cd lib/db && pnpm exec tsc -p tsconfig.json
cd lib/api-zod && pnpm exec tsc -p tsconfig.json
cd lib/api-client-react && pnpm exec tsc -p tsconfig.json

# 4. Verify
pnpm --filter @workspace/api-server run typecheck
```

---

## What Was Hardened (Phases 1-3)

### Phase 1 — Critical
- JWT authentication (removed all hardcoded user IDs)
- Task status state machine (enforced valid transitions)
- Server-side Zod request validation
- Database transactions for time tracking + QC

### Phase 2 — Important
- Computed overdue detection (deadline-based)
- `revision_needed` status replacing generic rejection
- Pagination (`limit`/`offset`) on task list
- SQL aggregation for dashboard (eliminated N+1 queries)
- Extracted reusable task query builder

### Phase 3 — Hardening
- React error boundary (prevents white-screen crashes)
- CORS restricted to known origins
- 30 integration tests (vitest + supertest)
- Optimistic locking with version column (409 on conflict)
