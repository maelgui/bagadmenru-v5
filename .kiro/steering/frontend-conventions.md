---
inclusion: fileMatch
fileMatchPattern: "frontend/**"
---

# Frontend Conventions

## Build & Dev Commands

```bash
cd frontend
yarn install                    # Install all workspace dependencies
yarn generate-client            # Regenerate API client (resolves the backend at http://backend:8000, the docker-compose service host; from the host machine the schema is proxied by Vite at http://localhost:5173/openapi.json)
yarn build:lib                  # Compile the generated TypeScript client
yarn build:app                  # Build the React app for production
yarn build                      # Build lib + app
yarn dev                        # Start Vite dev server on :5173
yarn lint                       # ESLint check
```

## Workspace Structure

This is a Yarn workspaces monorepo:

- `frontend/lib/` — Auto-generated OpenAPI TypeScript client (`bagad-client` package). **Never edit manually.**
- `frontend/app/` — Main React application that imports from `bagad-client`.

## Code Patterns

- **State management**: Zustand for UI/local state, React Query (`@tanstack/react-query`) for server state
- **Routing**: React Router v7 (`react-router-dom`)
- **Styling**: Tailwind CSS v4 with utility classes. Use `class-variance-authority` for component variants.
- **Forms**: `react-hook-form` with Zod validation
- **API calls**: Use the generated `bagad-client` library, wrapped in React Query hooks
- **Auth**: OIDC via `oidc-client-ts` + `react-oidc-context`, WebAuthn via `@simplewebauthn/browser`
- **Icons**: FontAwesome (`@fortawesome/react-fontawesome`)
- **Notifications**: `react-hot-toast` for toasts, Web Push API for system notifications

## Component Guidelines

- Functional components only (no class components)
- Use TypeScript strict mode
- Props interfaces defined above the component
- Prefer composition over prop drilling
- Storybook stories for reusable UI components (`yarn storybook`)

## API Client Regeneration

When backend endpoints change:
1. Ensure the backend is reachable. `yarn generate-client` reads the schema from
   `http://backend:8000/openapi.json` (the docker-compose service host), so run it
   with `docker compose up`. From the host machine outside Docker, the schema is
   also proxied by the Vite dev server at `http://localhost:5173/openapi.json`.
2. Run `yarn generate-client` from `frontend/`
3. Run `yarn build:lib` to compile
4. Update consuming code in `frontend/app/` as needed

Note: an event's `date` is a `Date` object in the generated client, but the client
serializes it in UTC on the wire. Building it at local midnight would shift it back a
day in positive-offset timezones (e.g. Europe/Paris), so normalize the picked date
with `toUtcDate` from `utils/date` before submitting (see `events/components/form.tsx`).

## Important Notes

- `frontend/lib/src/` is entirely auto-generated — changes will be overwritten
- The app imports the client as `bagad-client` (workspace dependency)
- Vite proxies API requests in dev mode (check `vite.config.ts`)
- ESLint allows up to 6 warnings (configured in package.json scripts)
