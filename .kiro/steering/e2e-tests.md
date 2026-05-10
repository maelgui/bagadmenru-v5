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
npm run test:smoke                        # Smoke tests only
npm run test:ui                           # Interactive UI mode
```

## Environment Configuration

Tests use environment variables for target URLs:
- `BASE_URL` — Frontend URL (default: http://localhost:5173)
- `API_URL` — Backend API URL (default: http://localhost:8888)
- `MAILPIT_URL` — Mailpit API for email verification (default: http://localhost:8025)

## CI Configuration

In CI, tests run against the beta environment:
```bash
BASE_URL=https://beta.bagadmenru.bzh \
API_URL=https://api.beta.bagadmenru.bzh \
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
