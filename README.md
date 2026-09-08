# Bagad Men Ru v5

Member management and event coordination platform for [Bagad Men Ru](https://bagadmenru.bzh), a Breton cultural music ensemble.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Frontend   │────▶│   Backend    │────▶│ PostgreSQL │
│  React/Vite │     │   FastAPI    │     │    15      │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                    ┌──────┴───────┐
                    │   S3 Storage │
                    │ (Scaleway)   │
                    └──────────────┘
```

| Component | Tech | Location |
|-----------|------|----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic | `backend/` |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS | `frontend/` |
| E2E Tests | Playwright | `e2e/` |
| Infrastructure | Kubernetes (K3s), Kustomize, Terraform | `k8s/`, `infra/` |

## Quick Start (Local Development)

```bash
# Start all services (PostgreSQL, MinIO, Mailpit, Backend, Frontend)
docker compose up

# Backend: http://localhost:8888 (API docs at /docs)
# Frontend: http://localhost:5173
# Mailpit (email UI): http://localhost:8025
# MinIO console: http://localhost:9090
```

## Running Multiple Checkouts in Parallel (git worktrees + Finch)

Several feature branches can run side by side using git worktrees, each with its
own isolated stack.

**Worktree layout.** All worktrees live in one dedicated sibling directory so the
parent folder doesn't get cluttered:

```
bagadmenru-v5-worktrees/
├── logout-all/
├── multi-account/
└── purge-unlinked/
```

Create one with:

```bash
git worktree add ../bagadmenru-v5-worktrees/<slug> -b feat/<slug>
git worktree list   # see all worktrees at any time
```

**Conflict-free stacks.** The stack publishes a single host port (`FRONTEND_PORT`,
default 5173); everything else (backend, db, minio, mailpit) is reached in-network
through the vite proxy. To run several stacks at once, give each a unique compose
project name and a free port:

```bash
# pick a free port (macOS)
p=5173; while lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; do p=$((p+1)); done

FRONTEND_PORT=$p finch compose -p bmr-<slug> up -d
# → app at http://localhost:$p

finch compose -p bmr-<slug> down        # stop this stack only
finch compose ls                        # list running stacks
```

**Storybook** is not part of the compose stack. Run it locally on demand from
`frontend/app`: `yarn storybook` (add `-- -p <port>` if 6006 is taken).

### HMR under Finch on macOS

On macOS the frontend runs inside a Finch/Docker Linux VM. Native filesystem
events (fsevents) don't cross the bind-mount boundary, so Vite's event-based
watcher never fires and HMR appears dead. The fix is chokidar **polling**, gated
on an env var so native dev keeps the cheaper event-based watching:

- `vite.config.ts` enables `server.watch.usePolling` (interval 1000ms) when
  `VITE_USE_POLLING=true`.
- `docker-compose.yml` sets `VITE_USE_POLLING=true` on the `frontend` service, so
  HMR works out of the box when running via Finch.

Tune the interval in `vite.config.ts` if reloads feel too slow (lower it) or the
VM CPU runs hot (raise it). The Python backend (`uvicorn --reload`) has not shown
this issue in practice; if it ever does, set `WATCHFILES_FORCE_POLLING=true` on
the `backend` service.

## Component Development

### Backend

```bash
cd backend
poetry install
poetry run alembic upgrade head    # Run migrations
poetry run uvicorn bbe2.main:app --reload
```

Linting & tests:
```bash
poetry run pylint bbe2 --fail-under 8
poetry run black --check bbe2
poetry run isort --check bbe2
poetry run mypy bbe2
poetry run pytest
```

### Frontend

```bash
cd frontend
yarn install
yarn build:lib       # Build the OpenAPI-generated client
yarn dev             # Start Vite dev server on :5173
```

Linting:
```bash
yarn lint
```

### E2E Tests

```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
npm run test
```

## API Domains

The backend exposes these API groups (all under `/api/v1`):

| Tag | Endpoint Module | Purpose |
|-----|----------------|---------|
| Profiles | `profiles.py` | User/member management, groups, roles |
| Events | `events.py` | Event scheduling, RSVP responses |
| Photos | `albums.py` | Photo albums and media |
| Files | `files.py` | File/folder management (S3) |
| Authentication | `auth.py` | JWT + WebAuthn (passkeys) |
| Push | `push.py` | Web push notifications (VAPID) |
| Utils | `utils.py` | Health checks, utilities |

## Environments

| Environment | Frontend URL | API URL |
|-------------|-------------|---------|
| Local | http://localhost:5173 | http://localhost:8888 |
| Beta | https://beta.bagadmenru.bzh | https://beta.bagadmenru.bzh/api |
| Production | https://bagadmenru.bzh | https://bagadmenru.bzh/api |

The API is served on the same origin as the frontend under the `/api` path
(no separate `api.*` subdomain, so no CORS is needed). On beta, the OpenAPI
schema is also reachable at `/openapi.json` for client generation.

## CI/CD Pipeline

GitHub Actions (`.github/workflows/release.yml`):
1. **Lint frontend** — ESLint + TypeScript build
2. **Test backend** — pylint, black, isort, mypy, pytest
3. **Build & push** — Docker images to GHCR
4. **Deploy beta** — Kustomize apply to K3s cluster
5. **E2E tests** — Playwright against beta

## Key Configuration

| File | Purpose |
|------|---------|
| `backend/pyproject.toml` | Python deps, linting config |
| `backend/alembic.ini` | Database migration settings |
| `frontend/package.json` | Workspace root, client generation |
| `frontend/app/package.json` | Frontend app dependencies |
| `docker-compose.yml` | Local dev environment |
| `k8s/` | Kubernetes manifests (Kustomize) |
| `infra/main.tf` | Terraform (Scaleway S3 + IAM) |

## Environment Variables

See `backend/bbe2/config.py` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `S3_ENDPOINT` | Object storage endpoint |
| `S3_BUCKET_NAME` | Storage bucket name |
| `JWT_SECRET_KEY` | JWT signing secret |
| `TOKEN_SECRET_KEY` | Token encryption secret |
| `SMTP_HOST` / `SMTP_PORT` | Email sending configuration |
| `IMAP_HOST` / `IMAP_PORT` | Email reading configuration |
| `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` | Push notification keys |
| `RELYING_PARTY_ID` | WebAuthn domain |
| `FRONTEND_BASE_URL` | Frontend URL for email links |
