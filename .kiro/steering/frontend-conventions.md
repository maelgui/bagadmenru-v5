---
inclusion: fileMatch
fileMatchPattern: "frontend/**"
---

# Frontend Conventions

## Build & Dev Commands

```bash
cd frontend
yarn install                    # Install all workspace dependencies
yarn generate-client            # Regenerate API client (needs backend running on :8000)
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
1. Ensure backend is running (`docker compose up backend` or local uvicorn)
2. Run `yarn generate-client` from `frontend/`
3. Run `yarn build:lib` to compile
4. Update consuming code in `frontend/app/` as needed

## Important Notes

- `frontend/lib/src/` is entirely auto-generated — changes will be overwritten
- The app imports the client as `bagad-client` (workspace dependency)
- Vite proxies API requests in dev mode (check `vite.config.ts`)
- ESLint allows up to 6 warnings (configured in package.json scripts)
