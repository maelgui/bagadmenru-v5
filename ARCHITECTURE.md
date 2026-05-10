# Architecture

## System Overview

Bagad Men Ru v5 is a member portal for a Breton music ensemble. It handles member profiles, event scheduling with attendance tracking, photo albums, file sharing, email communication, and push notifications.

## Component Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │              Kubernetes (K3s)                │
                    │                                             │
┌──────────┐       │  ┌───────────┐       ┌──────────────────┐  │
│  Browser │──────▶│  │  Traefik  │──────▶│    Frontend      │  │
│          │       │  │  Ingress  │       │  (Nginx + React) │  │
└──────────┘       │  │           │       └──────────────────┘  │
                    │  │           │                              │
                    │  │           │       ┌──────────────────┐  │
                    │  │           │──────▶│    Backend        │  │
                    │  └───────────┘       │  (FastAPI)        │  │
                    │                      └────────┬─────────┘  │
                    │                               │             │
                    │              ┌────────────────┼──────────┐  │
                    │              │                │          │  │
                    │              ▼                ▼          ▼  │
                    │  ┌────────────────┐  ┌──────────┐  ┌────┐  │
                    │  │  PostgreSQL 15 │  │ Scaleway │  │SMTP│  │
                    │  │  (StatefulSet) │  │    S3    │  │OVH │  │
                    │  └────────────────┘  └──────────┘  └────┘  │
                    └─────────────────────────────────────────────┘
```

## Backend (`backend/`)

### Structure

```
backend/bbe2/
├── api/v1/endpoints/   # Route handlers (one file per domain)
├── crud/               # Database operations (CRUD layer)
├── models/             # SQLAlchemy ORM models
├── schemas/            # Pydantic request/response schemas (in models/)
├── config.py           # Settings via pydantic-settings (env vars)
├── database.py         # SQLAlchemy engine & session setup
├── dependencies.py     # FastAPI dependency injection
├── main.py             # App factory, middleware, startup
└── cli.py              # Typer CLI (migrations, seeding)
```

### Patterns

- **Layered architecture**: Endpoints → CRUD → Models
- **Dependency injection**: FastAPI `Depends()` for DB sessions, auth
- **Settings**: `pydantic-settings` loads from environment variables
- **Migrations**: Alembic with auto-generated revisions
- **Auth flow**: JWT tokens + WebAuthn passkeys (FIDO2)
- **File uploads**: Presigned S3 URLs, metadata in PostgreSQL

### Domain Models

| Model | Purpose |
|-------|---------|
| `UserDB` | Member profiles with roles and group membership |
| `GroupDB` / `RoleDB` | Permission groups and roles |
| `EventDB` | Scheduled events (rehearsals, concerts, etc.) |
| `ResponseDB` | Member attendance responses to events |
| `AlbumDB` / `PhotoDB` | Photo albums and individual photos |
| `FileOrFolderDB` | Shared file/folder tree (S3-backed) |
| `PasskeyDB` | WebAuthn credential storage |
| `PushSubscriptionDB` | Web push notification subscriptions |

## Frontend (`frontend/`)

### Structure

```
frontend/
├── package.json        # Yarn workspace root
├── lib/                # Auto-generated OpenAPI TypeScript client
│   └── src/            # Generated fetch-based API client
└── app/                # Main React application
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/      # Route-level page components
    │   ├── hooks/      # Custom React hooks
    │   ├── stores/     # Zustand state stores
    │   └── utils/      # Shared utilities
    ├── vite.config.ts
    └── package.json
```

### Patterns

- **Monorepo**: Yarn workspaces with shared `bagad-client` library
- **API client**: Auto-generated from backend OpenAPI schema
- **State management**: Zustand for local state, React Query for server state
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 with class-variance-authority
- **Auth**: OIDC (via `oidc-client-ts`) + WebAuthn
- **Component docs**: Storybook for design system

### Client Generation

The frontend API client is generated from the backend's OpenAPI spec:
```bash
cd frontend
yarn generate-client   # Fetches /openapi.json from running backend
yarn build:lib         # Compiles the generated TypeScript
```

## Data Flow

### Authentication
1. User submits credentials or uses WebAuthn passkey
2. Backend validates and issues JWT access token
3. Frontend stores token and sends in `Authorization` header
4. Backend validates JWT on each request via dependency injection

### File Upload
1. Frontend requests presigned upload URL from backend
2. Backend generates S3 presigned URL, returns to frontend
3. Frontend uploads directly to S3
4. Backend stores file metadata in PostgreSQL

### Event Attendance
1. Admin creates event with details
2. Members receive push notification
3. Members submit attendance response (present/absent/maybe)
4. Admin views attendance summary

## Deployment

### Environments
- **Local**: Docker Compose (PostgreSQL, MinIO, Mailpit)
- **Beta**: K3s cluster, Scaleway S3, OVH email, sealed-secrets
- **Production**: Same K3s cluster, separate namespace

### CI/CD Flow
```
Push to main → Lint/Test → Build Docker images → Push to GHCR
                                                       │
                                                       ▼
                                              Deploy to Beta (Kustomize)
                                                       │
                                                       ▼
                                              E2E Tests (Playwright)
                                                       │
                                                       ▼
                                              Manual promote to Prod
```

### Infrastructure
- **Kubernetes**: Kustomize base + overlays per environment
- **Secrets**: Sealed-secrets (encrypted, safe to commit)
- **TLS**: cert-manager with Let's Encrypt
- **Ingress**: Traefik (bundled with K3s)
- **Storage**: Scaleway Object Storage (S3-compatible)
- **Terraform**: Manages Scaleway buckets and IAM
