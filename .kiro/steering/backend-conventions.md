---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# Backend Conventions

## Build & Test Commands

```bash
cd backend
poetry install                          # Install dependencies
poetry run alembic upgrade head         # Apply migrations
poetry run uvicorn bbe2.main:app --reload  # Dev server on :8000
poetry run pytest                       # Run tests with coverage
poetry run pylint bbe2 --fail-under 8   # Lint (fail on F/E/W)
poetry run black bbe2                   # Format code
poetry run isort bbe2                   # Sort imports
poetry run mypy bbe2                    # Type check
```

## Code Organization

- **Endpoints** (`bbe2/api/v1/endpoints/`): FastAPI route handlers. Thin layer that validates input, calls CRUD, returns response.
- **CRUD** (`bbe2/crud/`): Database operations. Each file handles one domain entity. Inherits from `CRUDBase` in `crud/base.py`.
- **Models** (`bbe2/models/`): SQLAlchemy ORM models. All inherit from `Base` in `models/base.py`.
- **Schemas**: Pydantic models for request/response validation. Located alongside ORM models or in endpoint files.
- **Config** (`bbe2/config.py`): All settings loaded from environment variables via `pydantic-settings`.
- **Dependencies** (`bbe2/dependencies.py`): FastAPI dependency injection (DB session, current user, etc.).

## Adding a New Feature

1. Define the ORM model in `bbe2/models/` and export it from `__init__.py`
2. Create an Alembic migration: `poetry run alembic revision --autogenerate -m "description"`
3. Add CRUD operations in `bbe2/crud/`
4. Create endpoint handlers in `bbe2/api/v1/endpoints/`
5. Register the router in `bbe2/api/v1/api.py`
6. Run the full lint/test suite before committing

## Style Rules

- Formatter: Black (default settings, line length 88)
- Import order: isort with `profile = "black"`
- Type annotations required on all public functions
- Use `Optional[X]` or `X | None` for nullable fields
- Pydantic models use `model_validator` / `field_validator` (v2 style)
- SQLAlchemy uses 2.0 style (mapped_column, DeclarativeBase)

## Database

- PostgreSQL 15 with psycopg3 (async-capable)
- Alembic for migrations (auto-generate from model changes)
- Connection string in `DATABASE_URL` env var
- Format: `postgresql+psycopg://user:pass@host/dbname`

## Authentication

- JWT tokens issued by the backend (signed with `JWT_SECRET_KEY`)
- WebAuthn/FIDO2 passkeys stored in `PasskeyDB` model
- Auth dependencies in `bbe2/dependencies.py` extract current user from token
