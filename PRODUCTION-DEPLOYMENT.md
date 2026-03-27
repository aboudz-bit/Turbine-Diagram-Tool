# Turbine QC — Production Deployment Guide

**Prepared**: 2026-03-27
**Branch**: `claude/code-review-suggestions-NjKjl`
**Validated**: Staging checklist 9/9 PASS, UAT 13/13 PASS, 0 code bugs

---

## 1. Production Environment Variables

### API Server

```bash
# Required
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/turbine_qc?sslmode=require
JWT_SECRET=<random-64-char-string>        # openssl rand -hex 32
CORS_ORIGINS=https://turbine.yourcompany.com

# Optional
LOG_LEVEL=info                             # debug | info | warn | error
```

### Frontend (build-time only)

```bash
BASE_PATH=/                                # or /turbine/ if behind a subpath
VITE_API_URL=https://turbine.yourcompany.com/api
```

### Generate JWT_SECRET

```bash
openssl rand -hex 32
# Example output: a3f8c1e9...  (64 hex chars)
```

**Do NOT use**: `turbine-qc-dev-secret` (the dev fallback)

---

## 2. Deployment Commands

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (17 tested)
- pnpm 9+

### Step-by-step

```bash
# 1. Clone and install
git clone <repo-url> turbine-qc
cd turbine-qc
git checkout claude/code-review-suggestions-NjKjl
pnpm install

# 2. Build frontend
BASE_PATH=/ pnpm --filter @workspace/turbine-app run build

# 3. Build backend
pnpm --filter @workspace/api-server run build

# 4. Push schema to production DB
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push

# 5. Seed initial data (users, assets, sections, stages, components)
DATABASE_URL="postgresql://..." pnpm --filter @workspace/scripts run seed

# 6. Start API server
NODE_ENV=production \
PORT=3001 \
DATABASE_URL="postgresql://..." \
JWT_SECRET="$(cat /etc/turbine-qc/jwt-secret)" \
CORS_ORIGINS="https://turbine.yourcompany.com" \
node --enable-source-maps artifacts/api-server/dist/index.mjs

# 7. Verify
curl http://localhost:3001/api/healthz
# Expected: {"status":"ok"}
```

### Artifacts produced

| Artifact | Path | Description |
|----------|------|-------------|
| API server | `artifacts/api-server/dist/index.mjs` | Single bundled ESM file |
| Frontend | `artifacts/turbine-app/dist/public/` | Static HTML/JS/CSS |

---

## 3. Process Management

### systemd (recommended)

```ini
# /etc/systemd/system/turbine-qc.service
[Unit]
Description=Turbine QC API Server
After=network.target postgresql.service

[Service]
Type=simple
User=turbine
WorkingDirectory=/opt/turbine-qc
EnvironmentFile=/etc/turbine-qc/env
ExecStart=/usr/bin/node --enable-source-maps artifacts/api-server/dist/index.mjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/turbine-qc/env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://turbine:password@localhost:5432/turbine_qc?sslmode=require
JWT_SECRET=<your-secret>
CORS_ORIGINS=https://turbine.yourcompany.com
```

```bash
sudo systemctl enable turbine-qc
sudo systemctl start turbine-qc
sudo journalctl -u turbine-qc -f    # tail logs
```

### PM2 (alternative)

```bash
pm2 start artifacts/api-server/dist/index.mjs \
  --name turbine-qc \
  --node-args="--enable-source-maps" \
  --env production
pm2 save
pm2 startup
```

---

## 4. Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name turbine.yourcompany.com;

    ssl_certificate     /etc/letsencrypt/live/turbine.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/turbine.yourcompany.com/privkey.pem;

    # Frontend (static files)
    location / {
        root /opt/turbine-qc/artifacts/turbine-app/dist/public;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # File uploads
        client_max_body_size 10M;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name turbine.yourcompany.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 5. Database Backup & Restore

### Automated daily backup

```bash
# /etc/cron.d/turbine-qc-backup
0 2 * * * turbine pg_dump -Fc turbine_qc > /var/backups/turbine-qc/turbine_qc_$(date +\%Y\%m\%d).dump 2>&1
0 3 * * * turbine find /var/backups/turbine-qc -name "*.dump" -mtime +30 -delete
```

### Manual backup

```bash
pg_dump -Fc -d turbine_qc -f turbine_qc_backup.dump
```

### Restore

```bash
# Restore to a fresh database
createdb turbine_qc_restored
pg_restore -d turbine_qc_restored turbine_qc_backup.dump

# Or overwrite existing (destructive)
pg_restore --clean --if-exists -d turbine_qc turbine_qc_backup.dump
```

### Pre-deployment backup

```bash
# Always backup before schema changes
pg_dump -Fc -d turbine_qc -f pre_deploy_$(date +%Y%m%d_%H%M%S).dump
DATABASE_URL="..." pnpm --filter @workspace/db run push
```

---

## 6. Monitoring & Logging

### Health check endpoint

```bash
# Uptime monitor (cron, UptimeRobot, Datadog, etc.)
curl -sf https://turbine.yourcompany.com/api/healthz || alert
```

### Log aggregation

With systemd, logs go to journald:

```bash
# Real-time
journalctl -u turbine-qc -f

# Last hour
journalctl -u turbine-qc --since "1 hour ago"

# Export for analysis
journalctl -u turbine-qc --since today -o json > /var/log/turbine-qc-today.json
```

For centralized logging, pipe to your preferred collector:

```bash
# Filebeat / Fluentd / Vector
journalctl -u turbine-qc -f -o json | vector --config /etc/vector/turbine.toml
```

### Key metrics to monitor

| Metric | Source | Alert threshold |
|--------|--------|-----------------|
| API health | `GET /healthz` | Any non-200 |
| Response time | nginx access log | p95 > 2s |
| DB connections | `pg_stat_activity` | > 80% of max |
| Disk usage | OS | > 85% |
| Process alive | systemd | service inactive |
| Error rate | application logs | > 5 errors/min |

### PostgreSQL monitoring

```bash
# Active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='turbine_qc';"

# Long-running queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
         FROM pg_stat_activity
         WHERE datname='turbine_qc' AND state != 'idle'
         ORDER BY duration DESC LIMIT 5;"

# Table sizes
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
         FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
```

---

## 7. Rollback Plan

### Scenario A: Code rollback (no schema changes)

```bash
# 1. Stop current server
sudo systemctl stop turbine-qc

# 2. Checkout previous known-good commit
cd /opt/turbine-qc
git log --oneline -5               # identify rollback target
git checkout <previous-commit>

# 3. Rebuild
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/turbine-app run build

# 4. Restart
sudo systemctl start turbine-qc
```

### Scenario B: Code + schema rollback

```bash
# 1. Stop server
sudo systemctl stop turbine-qc

# 2. Restore database from pre-deployment backup
pg_restore --clean --if-exists -d turbine_qc pre_deploy_<timestamp>.dump

# 3. Checkout and rebuild previous version
git checkout <previous-commit>
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/turbine-app run build

# 4. Restart
sudo systemctl start turbine-qc
```

### Scenario C: Emergency — revert to last known-good state

```bash
# If the current deployment is broken and blocking users:
sudo systemctl stop turbine-qc
pg_restore --clean --if-exists -d turbine_qc /var/backups/turbine-qc/turbine_qc_<latest>.dump
git checkout <last-deployed-tag>
pnpm install && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/turbine-app run build
sudo systemctl start turbine-qc
curl -sf http://localhost:3001/api/healthz && echo "RECOVERED" || echo "STILL DOWN"
```

---

## 8. Final Go-Live Checklist

Run these checks immediately before and after go-live.

### Pre go-live

- [ ] Database backed up (`pg_dump -Fc`)
- [ ] `JWT_SECRET` is production-grade (64+ hex chars, not dev fallback)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to exact production domain (no wildcards)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] HTTPS configured with valid certificate
- [ ] nginx `try_files` configured for SPA routing
- [ ] `client_max_body_size` set for file uploads (10M)
- [ ] systemd service enabled (`systemctl enable turbine-qc`)
- [ ] Cron backup job installed
- [ ] No `localhost` references in frontend build
- [ ] No secrets in frontend build (`grep -r "secret" artifacts/turbine-app/dist/`)
- [ ] Firewall: only 80/443 exposed, DB port (5432) internal only

### Post go-live

- [ ] `GET /api/healthz` returns `{"status":"ok"}`
- [ ] Login works for all 5 user roles
- [ ] Task creation succeeds
- [ ] Time tracking start/stop works
- [ ] File upload works
- [ ] Notifications appear
- [ ] Frontend loads without console errors
- [ ] HTTPS redirect works (HTTP → HTTPS)
- [ ] Invalid token returns 401

---

## 9. Database Schema Reference

14 tables managed by Drizzle ORM (`drizzle-kit push`):

| Table | Purpose |
|-------|---------|
| `users` | User accounts (5 roles) |
| `tasks` | QC inspection tasks with state machine |
| `assets` | Turbine units (SGT-9000HL, SGT-8000H) |
| `asset_sections` | Major sections (Compressor, Turbine, etc.) |
| `asset_stages` | Stages within sections |
| `asset_components` | Components within stages |
| `time_entries` | Work session tracking |
| `qc_reviews` | QC review decisions |
| `signatures` | Digital signatures (completion + QC approval) |
| `notifications` | In-app notifications |
| `attachments` | File upload metadata |
| `audit_logs` | Full activity trail |
| `task_checklists` | Checklist headers per task |
| `checklist_items` | Individual checklist items |

Enums: `task_status`, `task_priority`, `user_role`, `checklist_item_type`

---

## 10. Support Contacts & Escalation

| Issue | Action |
|-------|--------|
| Server down | Check `systemctl status turbine-qc`, restart if needed |
| DB connection refused | Check `pg_isready`, verify PostgreSQL is running |
| 502 Bad Gateway | API server crashed — check `journalctl -u turbine-qc` |
| Login fails | Verify JWT_SECRET hasn't changed, check token expiry (24h default) |
| Stale data after deploy | Clear browser cache, verify frontend build was updated |
| Schema mismatch | Run `pnpm --filter @workspace/db run push` against production DB |
