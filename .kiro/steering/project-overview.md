# Project Overview

This is **Bagad Men Ru v5**, a member management platform for a Breton music ensemble. It handles member profiles, event scheduling, photo albums, file sharing, email, and push notifications.

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x, PostgreSQL 15, Alembic, Poetry
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Yarn workspaces
- **E2E Tests**: Playwright
- **Infrastructure**: Kubernetes (K3s), Kustomize, Terraform (Scaleway), Docker
- **CI/CD**: GitHub Actions

## Repository Layout

| Path | Description |
|------|-------------|
| `backend/` | FastAPI application (Python) |
| `backend/bbe2/` | Main application package |
| `backend/bbe2/api/v1/endpoints/` | API route handlers |
| `backend/bbe2/crud/` | Database CRUD operations |
| `backend/bbe2/models/` | SQLAlchemy ORM models + Pydantic schemas |
| `frontend/` | Yarn workspace root |
| `frontend/app/` | React application |
| `frontend/lib/` | Auto-generated OpenAPI TypeScript client |
| `e2e/` | Playwright E2E tests |
| `k8s/` | Kubernetes manifests (Kustomize) |
| `infra/` | Terraform infrastructure code |
| `docker-compose.yml` | Local development environment |

## Key Patterns

- Backend uses layered architecture: **Endpoints → CRUD → Models**
- Frontend API client is auto-generated from backend OpenAPI spec
- Environment configuration via `pydantic-settings` (all env vars)
- Auth: JWT tokens + WebAuthn passkeys
- File storage: S3-compatible (MinIO locally, Scaleway in prod)
- Secrets in K8s: sealed-secrets (encrypted, committed to git)
