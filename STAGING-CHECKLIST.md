# Turbine QC — Pre-Deployment Staging Checklist

Run every item below against your staging environment before go-live. Mark each box when verified.

---

## 1. Environment Variables

```bash
# API Server — verify all are set
echo "PORT:          ${PORT:?MISSING}"
echo "DATABASE_URL:  ${DATABASE_URL:?MISSING}"
echo "JWT_SECRET:    ${JWT_SECRET:?MISSING}"
echo "CORS_ORIGINS:  ${CORS_ORIGINS:?MISSING}"
echo "NODE_ENV:      ${NODE_ENV:?MISSING}"
```

- [ ] `PORT` is set (API server listen port)
- [ ] `DATABASE_URL` points to staging PostgreSQL (not dev/local)
- [ ] `JWT_SECRET` is a random string, 32+ characters, NOT `turbine-qc-dev-secret`
- [ ] `CORS_ORIGINS` lists only the staging frontend URL (e.g. `https://staging.example.com`)
- [ ] `NODE_ENV=production`
- [ ] Frontend `BASE_PATH` matches reverse proxy path (e.g. `/` or `/turbine/`)

---

## 2. Database Connection

```bash
# From the API server host:
psql "$DATABASE_URL" -c "SELECT 1;"
```

- [ ] Connection succeeds (no timeout, no auth error)
- [ ] Database user has CREATE/INSERT/UPDATE/DELETE on `public` schema
- [ ] SSL mode is appropriate for your infra (`?sslmode=require` if remote)

---

## 3. Schema & Application Verification

```bash
# Push schema to staging DB
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push

# Seed demo data (idempotent)
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/scripts run seed
```

- [ ] `drizzle-kit push` completes without errors
- [ ] Verify tables exist:
  ```bash
  psql "$DATABASE_URL" -c "\dt"
  ```
  Expected: `users`, `tasks`, `assets`, `asset_sections`, `asset_stages`, `asset_components`, `time_entries`, `qc_reviews`
- [ ] Verify `task_status` enum includes `revision_needed`:
  ```bash
  psql "$DATABASE_URL" -c "SELECT unnest(enum_range(NULL::task_status));"
  ```
- [ ] Verify `tasks.version` column exists:
  ```bash
  psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tasks' AND column_name='version';"
  ```
- [ ] Seed data loads (5 users, 1 asset, sections/stages/components, 5 sample tasks)

---

## 4. Auth / Login Verification

```bash
# Start API server
node --enable-source-maps ./artifacts/api-server/dist/index.mjs &

# Get user list (public)
curl -s http://localhost:$PORT/api/users | jq '.[0]'

# Login as first user
TOKEN=$(curl -s http://localhost:$PORT/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}' | jq -r '.token')
echo "TOKEN: $TOKEN"

# Verify token works
curl -s http://localhost:$PORT/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.name'
```

- [ ] `GET /api/users` returns user list without auth
- [ ] `POST /api/auth/login` returns `{ token, user }`
- [ ] `GET /api/auth/me` returns user profile with valid token
- [ ] `GET /api/tasks` returns 401 without token
- [ ] `GET /api/healthz` returns 200 without token

---

## 5. Core Workflow Verification

Run these sequentially with a valid `$TOKEN`. Replace `$PORT` with your API port.

```bash
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

# Get IDs for test data
ASSET_ID=$(curl -s -H "$AUTH" http://localhost:$PORT/api/assets | jq '.[0].id')
SECTION_ID=$(curl -s -H "$AUTH" http://localhost:$PORT/api/assets/$ASSET_ID | jq '.sections[0].id')
USER_ID=$(curl -s -H "$AUTH" http://localhost:$PORT/api/auth/me | jq '.id')
```

### 5a. Create task (draft)
```bash
TASK=$(curl -s -X POST http://localhost:$PORT/api/tasks \
  -H "$AUTH" -H "$CT" \
  -d "{\"title\":\"Staging Test Task\",\"assetId\":$ASSET_ID,\"sectionId\":$SECTION_ID,\"priority\":\"high\"}")
TASK_ID=$(echo $TASK | jq '.id')
echo "Task ID: $TASK_ID, Status: $(echo $TASK | jq -r '.status')"
```
- [ ] Status is `draft`, version is `1`

### 5b. Assign
```bash
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d '{"status":"assigned","version":1}' | jq '{status, version}'
```
- [ ] Status is `assigned`, version is `2`

### 5c. Start (time tracking)
```bash
curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/time \
  -H "$AUTH" -H "$CT" -d '{}' | jq '{id, startTime}'
```
- [ ] Returns time entry with `startTime`, task moves to `in_progress`

### 5d. Pause
```bash
curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/time/pause \
  -H "$AUTH" -H "$CT" \
  -d '{"reason":"Lunch break"}' | jq '{endTime, durationMinutes: .duration, pauseReason}'
```
- [ ] Time entry closed with duration, task status is `paused`

### 5e. Resume
```bash
curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/time/resume \
  -H "$AUTH" -H "$CT" -d '{}' | jq '{id, startTime}'
```
- [ ] New time entry created, task back to `in_progress`

### 5f. Submit
```bash
# Pause first (can't go in_progress -> submitted without pause/stop)
curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/time/pause \
  -H "$AUTH" -H "$CT" -d '{"reason":"Done"}' > /dev/null

# Get current version
VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')

curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"submitted\",\"version\":$VER}" | jq '{status, version}'
```
- [ ] Status is `submitted`

### 5g. Move to under_qc
```bash
VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"under_qc\",\"version\":$VER}" | jq '{status, version}'
```
- [ ] Status is `under_qc`

### 5h. QC Reject -> revision_needed
```bash
curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/qc \
  -H "$AUTH" -H "$CT" \
  -d '{"decision":"rejected","comments":"Alignment off by 2 degrees"}' | jq '{decision, comments}'

curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '{status, version}'
```
- [ ] QC review created with `rejected` decision
- [ ] Task status is `revision_needed`

### 5i. Revision flow: revision_needed -> in_progress -> submitted -> under_qc -> approved
```bash
VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"in_progress\",\"version\":$VER}" | jq '{status}'

VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"submitted\",\"version\":$VER}" | jq '{status}'

VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"under_qc\",\"version\":$VER}" | jq '{status}'

curl -s -X POST http://localhost:$PORT/api/tasks/$TASK_ID/qc \
  -H "$AUTH" -H "$CT" \
  -d '{"decision":"approved"}' | jq '{decision}'

curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '{status}'
```
- [ ] Final status is `approved`
- [ ] Task has 2 QC reviews (1 rejected, 1 approved)

### 5j. Approved task is locked
```bash
VER=$(curl -s http://localhost:$PORT/api/tasks/$TASK_ID -H "$AUTH" | jq '.version')
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK_ID \
  -H "$AUTH" -H "$CT" \
  -d "{\"status\":\"draft\",\"version\":$VER}" -o /dev/null -w "%{http_code}"
```
- [ ] Returns `403`

---

## 6. Frontend Production Build

```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/turbine-app run build
ls -la artifacts/turbine-app/dist/public/index.html
ls -la artifacts/turbine-app/dist/public/assets/
```

- [ ] Build completes without errors
- [ ] `dist/public/index.html` exists
- [ ] `dist/public/assets/` contains `.js` and `.css` bundles
- [ ] `index.html` references correct `BASE_PATH` for asset URLs
- [ ] No `.env` or secrets in build output: `grep -r "turbine-qc-dev-secret" artifacts/turbine-app/dist/ || echo "CLEAN"`

---

## 7. Backend Production Build

```bash
pnpm --filter @workspace/api-server run build
ls -la artifacts/api-server/dist/index.mjs
```

- [ ] Build completes without errors
- [ ] `dist/index.mjs` is a single bundled file
- [ ] Runs standalone without `node_modules`: `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
- [ ] Health check responds: `curl http://localhost:$PORT/api/healthz`

---

## 8. CORS / JWT / API URL

### CORS
```bash
# Allowed origin — should return Access-Control-Allow-Origin header
curl -s -I -X OPTIONS http://localhost:$PORT/api/tasks \
  -H "Origin: https://staging.example.com" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control

# Blocked origin — should NOT return Access-Control-Allow-Origin
curl -s -I -X OPTIONS http://localhost:$PORT/api/tasks \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control
```
- [ ] Allowed origin gets `Access-Control-Allow-Origin` header
- [ ] Unknown origin is blocked (no ACAO header)

### JWT
```bash
# Expired/invalid token
curl -s http://localhost:$PORT/api/tasks \
  -H "Authorization: Bearer invalid.token.here" -o /dev/null -w "%{http_code}"
```
- [ ] Returns `401`
- [ ] `JWT_SECRET` is NOT the dev fallback value

### API URL
- [ ] Frontend `.env` or build config points API calls to correct staging API URL
- [ ] No `localhost` references in production frontend build

---

## 9. Optimistic Locking Conflict Test

```bash
# Create a fresh task
TASK2=$(curl -s -X POST http://localhost:$PORT/api/tasks \
  -H "$AUTH" -H "$CT" \
  -d "{\"title\":\"Conflict Test\",\"assetId\":$ASSET_ID,\"sectionId\":$SECTION_ID,\"priority\":\"medium\"}")
TASK2_ID=$(echo $TASK2 | jq '.id')

# First update succeeds (version 1 -> 2)
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK2_ID \
  -H "$AUTH" -H "$CT" \
  -d '{"status":"assigned","version":1}' -o /dev/null -w "%{http_code}"
# Expected: 200

# Second update with stale version (still sends version 1) — should fail
curl -s -X PATCH http://localhost:$PORT/api/tasks/$TASK2_ID \
  -H "$AUTH" -H "$CT" \
  -d '{"status":"in_progress","version":1}' -o /dev/null -w "%{http_code}"
# Expected: 409
```

- [ ] First PATCH returns `200`
- [ ] Second PATCH with stale version returns `409`
- [ ] Response body contains conflict error message

---

## 10. Final Go-Live Checks

- [ ] All 30 integration tests pass: `DATABASE_URL="..." pnpm --filter @workspace/api-server run test`
- [ ] No hardcoded `localhost` in production configs
- [ ] Reverse proxy (nginx/Caddy) routes `/api/*` to API server, `/` to static frontend
- [ ] `try_files $uri $uri/ /index.html` configured for SPA routing
- [ ] HTTPS enabled with valid certificate
- [ ] Database backups configured
- [ ] Application logs are captured (stdout/stderr → log aggregator)
- [ ] Process manager (systemd/PM2/Docker) restarts API server on crash
- [ ] Seed data reviewed — remove or keep demo data as appropriate for UAT
- [ ] All 5 seeded users accessible via login picker

---

## Quick Pass/Fail Summary

| Section | Status |
|---------|--------|
| 1. Env vars | |
| 2. DB connection | |
| 3. Schema/seed | |
| 4. Auth/login | |
| 5. Core workflow | |
| 6. Frontend build | |
| 7. Backend build | |
| 8. CORS/JWT/API | |
| 9. Optimistic locking | |
| 10. Go-live | |
