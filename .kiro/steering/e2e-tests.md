---
inclusion: fileMatch
fileMatchPattern: "e2e/**"
---

# E2E Test Conventions

## Commands

```bash
cd e2e
npm ci                                    # Install dependencies
npx playwright install --with-deps chromium  # Install browser
npm run test                              # Run all tests (local)
npm run test:local                        # Local: Mailpit via the vite proxy
npm run test:smoke                        # Smoke tests only
npm run test:ui                           # Interactive UI mode
```

## Environment Configuration

Tests use environment variables for target URLs:
- `BASE_URL` — Frontend origin (default: http://localhost:5173). The API is
  served on the **same origin** under `/api`, so there is no separate API URL to
  configure — API request contexts derive their base from `BASE_URL`.
- `MAILPIT_URL` — Mailpit API for email verification (default: http://localhost:8025).
  Mailpit runs with `MP_WEBROOT=_mail` in every environment, so its API lives
  under `/_mail`. In the local docker/finch compose stack Mailpit has **no
  published host port**; it is reached through the vite proxy at
  `http://localhost:5173/_mail`. Use `npm run test:local`, which sets this for
  you. In CI the pod is port-forwarded, so the URL is `http://localhost:8025/_mail`.
  The Mailpit helper preserves the `/_mail` path prefix when building API URLs.

## CI Configuration

In CI, tests run against the beta environment:
```bash
BASE_URL=https://beta.bagadmenru.bzh \
MAILPIT_URL=http://localhost:8025 \
npm run test:ci
```

Mailpit is accessed via `kubectl port-forward` in CI.

## Writing Tests

- Use Playwright's page object pattern for reusable interactions
- Tests should be independent and not rely on execution order
- Use Mailpit API to verify email sending (check inbox, extract links)
- Browser: Chromium only (configured in playwright.config.ts)
- Smoke tests go in a separate config (`playwright.smoke.config.ts`)
