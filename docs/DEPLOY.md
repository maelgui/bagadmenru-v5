# Deployment Architecture

## Overview

Push-based deployment using GitHub Releases + a webhook listener on the VPS. Everything runs on a single domain.

```
push to main
  → CI: lint + test + build images → push to GHCR (:beta + :sha)
  → CI: bundle deploy config → create GitHub Release
  → CI: curl webhook on VPS
  → VPS: download release tarball → extract → docker compose pull → up -d
```

## Infrastructure

| Component | Where | Domain |
|---|---|---|
| Frontend (nginx + Vite build) | VPS / Docker | `beta.bagadmenru.bzh` |
| Backend (FastAPI) | VPS / Docker | `beta.bagadmenru.bzh/api/` (proxied by nginx) |
| Postgres 15 | VPS / Docker | internal |
| Email API (Rust) | VPS / Docker | internal |
| OPA authorizer | VPS / Docker | internal |
| Object storage | Scaleway S3 | `s3.fr-par.scw.cloud` |
| Reverse proxy / TLS | Traefik on VPS | — |
| Container registry | GHCR | `ghcr.io/maelgui/bagadmenru-v5/*` |

Frontend nginx proxies `/api/` requests to the backend container internally. No CORS needed — everything is same-origin.

## CI Pipeline (`.github/workflows/release.yml`)

```
lint-authorizer ─────────────────────────────┐
lint-frontend (needs build-authz-policy-wasm)─┤
test-backend ─────────────────────────────────┤
build-authz-policy-wasm ──────────────────────┤
build-authz-policy-oci ───────────────────────┤
                                              ▼
                                         build-push (matrix: backend, frontend, email-api)
                                              │
                                              ▼
                                        create-release (tarball: docker-compose.prod.yml + opa/ + deploy/)
                                              │
                                              ▼
                                         deploy-vps (curl webhook with release tag)
```

## Release Tarball Contents

Created by `create-release` job, attached to each GitHub Release:

- `docker-compose.prod.yml` — service definitions, Traefik labels, env var references
- `opa/` — OPA authorization policies (mounted into authorizer container)
- `deploy/` — `deploy.sh` + `hooks.json` (webhook config)

## VPS Deploy Mechanism

### Webhook listener

[adnanh/webhook](https://github.com/adnanh/webhook) listens on port 9000, validates a token, then runs `deploy.sh`.

**Config:** `deploy/hooks.json`
- Endpoint: `POST /hooks/deploy?token=<TOKEN>&tag=<RELEASE_TAG>`
- Validates `token` against `$DEPLOY_TOKEN` env var
- Passes `tag` query param to `deploy.sh` as `$1`

### Deploy script (`deploy/deploy.sh`)

1. Downloads release tarball from GitHub (via `gh release download`)
2. Extracts to `/opt/bagadmenru` (overwrites compose file, opa policies, deploy scripts)
3. `docker compose pull` — pulls new images from GHCR
4. `docker compose up -d --remove-orphans` — restarts changed services

### Rollback

```sh
cd /opt/bagadmenru
gh release list --repo maelgui/bagadmenru-v5
./deploy/deploy.sh deploy-20260414-153000-abc1234
```

## VPS Setup Checklist

1. Install `webhook` binary and `gh` CLI
2. `gh auth login` (for private repo release downloads)
3. Copy `deploy/hooks.json` and `deploy/deploy.sh` to `/opt/bagadmenru/deploy/`
4. Set `DEPLOY_TOKEN` env var (random secret)
5. Start webhook: `webhook -hooks /opt/bagadmenru/deploy/hooks.json -port 9000 -verbose`
6. Expose port 9000 via Traefik (or firewall allow from GitHub Actions IPs)
7. Add GitHub repo secret: `DEPLOY_WEBHOOK_URL=https://your-vps:9000/hooks/deploy?token=<TOKEN>`

## Secrets

| Secret | Where | Purpose |
|---|---|---|
| `DEPLOY_WEBHOOK_URL` | GitHub repo secrets | Full webhook URL with token |
| `DEPLOY_TOKEN` | VPS env var | Webhook auth |
| `.env` on VPS | `/opt/bagadmenru/.env` | DB passwords, S3 keys, JWT secrets, OVH keys, IMAP password |

## Future Considerations

- **Staging env:** same VPS with separate compose file + subdomains, or second VPS
- **Systemd unit** for webhook listener (auto-start on reboot)
- **Health check** endpoint in deploy script (verify services are up after deploy)
- **Notifications** (Slack/Discord webhook on deploy success/failure)
