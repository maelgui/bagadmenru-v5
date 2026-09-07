# Contributing

## Prerequisites

- Docker & Docker Compose
- Python 3.12+ with Poetry
- Node.js 22+ with Yarn 1.x

## Local Setup

```bash
# 1. Start infrastructure services
docker compose up db storage mailpit -d

# 2. Backend
cd backend
poetry install
poetry run alembic upgrade head
poetry run bbe2 seed-e2e          # Optional: seed test data
poetry run uvicorn bbe2.main:app --reload

# 3. Frontend
cd frontend
yarn install
yarn build:lib                    # Build API client from OpenAPI spec
yarn dev                          # Vite dev server on :5173
```

Or use Docker Compose for everything:
```bash
docker compose up
```

## Development Workflow

### Backend Changes

1. Write code in `backend/bbe2/`
2. Run the full lint/test suite:
   ```bash
   cd backend
   poetry run black bbe2
   poetry run isort bbe2
   poetry run pylint bbe2 --fail-under 8
   poetry run mypy bbe2
   poetry run pytest
   ```
3. If you changed models, create a migration:
   ```bash
   poetry run alembic revision --autogenerate -m "description"
   poetry run alembic upgrade head
   ```

### Frontend Changes

1. Write code in `frontend/app/src/`
2. Run linting:
   ```bash
   cd frontend
   yarn lint
   yarn build
   ```
3. If backend API changed, regenerate the client:
   ```bash
   yarn generate-client   # Reads http://backend:8000/openapi.json (docker-compose host); from the host, Vite proxies it at http://localhost:5173/openapi.json
   yarn build:lib
   ```

### Adding a New API Endpoint

1. Create or update the endpoint in `backend/bbe2/api/v1/endpoints/`
2. Add CRUD operations in `backend/bbe2/crud/`
3. Define Pydantic schemas in `backend/bbe2/models/`
4. Register the router in `backend/bbe2/api/v1/api.py`
5. Regenerate the frontend client

### Database Migrations

Alembic manages schema changes:
```bash
cd backend
poetry run alembic revision --autogenerate -m "Add column X to table Y"
poetry run alembic upgrade head     # Apply
poetry run alembic downgrade -1     # Rollback one step
```

## Code Style

### Backend (Python)
- **Formatter**: Black (line length 88)
- **Import sorting**: isort (black-compatible profile)
- **Linting**: pylint (score >= 8, fail on Fatal/Error/Warning)
- **Type checking**: mypy with pydantic plugin

### Frontend (TypeScript)
- **Linting**: ESLint with TypeScript and React plugins
- **Styling**: Tailwind CSS utility classes
- **Components**: Functional components with hooks

## Testing

### Unit Tests (Backend)
```bash
cd backend
poetry run pytest                  # With coverage report
poetry run pytest -x               # Stop on first failure
poetry run pytest -k "test_name"   # Run specific test
```

### E2E Tests (Playwright)
```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
npm run test                       # Against local environment
npm run test:smoke                 # Smoke tests only
```

## Project Conventions

- Backend follows a layered pattern: **Endpoints → CRUD → Models**
- All API responses use Pydantic schemas for serialization
- Environment config is managed via `pydantic-settings` (env vars)
- Frontend state: Zustand for UI state, React Query for server data
- The `bagad-client` library is auto-generated — never edit `frontend/lib/src/` manually
- Kubernetes secrets are sealed — use `kubeseal` to encrypt new secrets
