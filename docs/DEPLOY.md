# Deployment

- [Architecture](#architecture)
- [Environments](#environments)
- [Image Tagging](#image-tagging)
- [Compose Files](#compose-files)
- [CI Pipeline](#ci-pipeline)
- [Deploy Mechanism](#deploy-mechanism)
- [First Deployment Guide (Beta)](#first-deployment-guide-beta)
- [Day-to-Day Operations](#day-to-day-operations)
- [Secrets Reference](#secrets-reference)

---

## Architecture

Two environments (beta + prod) on the same VPS. One deploy tag ties images + config together. No rebuild to promote.

```
push to main → build images :deploy-YYYYMMDD-HHMMSS-sha
             → create GitHub Release with deploy tarball
             → auto-deploy beta

promote to prod → deploy.sh prod <same-deploy-tag>
                  (same images, same tarball — zero rebuild)
```

## Environments

| | Beta | Prod |
|---|---|---|
| Trigger | automatic (push to `main`) | manual (`deploy.sh` or webhook) |
| Domain | `beta.bagadmenru.bzh` | `prod.bagadmenru.bzh` |
| API domain | `api.beta.bagadmenru.bzh` | `api.prod.bagadmenru.bzh` |
| Deploy path | `/opt/bagadmenru-beta/` | `/opt/bagadmenru-prod/` |
| Docker project | `bagadmenru-beta` | `bagadmenru-prod` |
| DB volume | `bagadmenru-beta_backend-pgdata` | `bagadmenru-prod_backend-pgdata` |
| SMTP | mailpit (mock, no real emails sent) | OVH real SMTP (`ssl0.ovh.net:465`) |
| S3 bucket | `bagadmenru5-data-staging` | `bagadmenru5-data-prod` |

## Image Tagging

Every push to `main` produces Docker images tagged `:deploy-YYYYMMDD-HHMMSS-sha` (immutable).

Both beta and prod reference the same tag via `IMAGE_TAG` in their `.env`. This guarantees prod runs exactly what was tested on beta.

## Compose Files

| File | Purpose |
|---|---|
| `docker-compose.base.yml` | All services with parameterized Traefik labels (`${ENV_NAME}`, `${DOMAIN}`), SMTP config, etc. |
| `docker-compose.beta.yml` | Beta-only services: mailpit (mock SMTP) |
| `docker-compose.prod.yml` | Empty (prod has no extra services) |

Environment-specific config (domain, SMTP, S3 bucket) comes from `.env`, not from the override files.

Run with:
```sh
docker compose -f docker-compose.base.yml -f docker-compose.<env>.yml -p bagadmenru-<env> up -d
```

## CI Pipeline

Defined in `.github/workflows/release.yml`. Runs on every push to `main` and on PRs (lint/test only).

```
lint-authorizer ─────────────────────────────┐
lint-frontend (needs build-authz-policy-wasm)─┤
test-backend ─────────────────────────────────┤
build-authz-policy-wasm ──────────────────────┤
build-authz-policy-oci ───────────────────────┤
generate-tag ─────────────────────────────────┤
                                              ▼
                                         build-push (3x matrix, shared tag)
                                              │
                                              ▼
                                        create-release (tarball)
                                              │
                                              ▼
                                         deploy-beta (curl webhook)
```

### What's in the release tarball

```
deploy.tar.gz
├── docker-compose.base.yml
├── docker-compose.beta.yml
├── docker-compose.prod.yml
└── opa/
```

## Deploy Mechanism

### Webhook

[adnanh/webhook](https://github.com/adnanh/webhook) runs as a systemd service, proxied through Traefik at `webhook.vps-02.maelgui.fr`.

- **Endpoint:** `POST https://webhook.vps-02.maelgui.fr/hooks/deploy?token=<TOKEN>&env=<beta|prod>&tag=<deploy-tag>`
- Validates `token` against `$DEPLOY_TOKEN`
- Passes `env` and `tag` to `deploy.sh`

### Deploy script (`deploy/deploy.sh`)

```
deploy.sh <beta|prod> <deploy-tag>
```

1. Validates `env` is `beta` or `prod`
2. Loads `GITHUB_TOKEN` from `.env`
3. Downloads the release tarball via GitHub API (`curl`)
4. Extracts to `/opt/bagadmenru-<env>/`
5. Updates `IMAGE_TAG=<deploy-tag>` in `.env`
6. `docker compose pull` + `up -d`

---

## First Deployment Guide (Beta)

Step-by-step guide to deploy the beta environment for the first time.

### Prerequisites

- VPS with Docker and Docker Compose installed
- `jq` installed (`apt install jq` or `yum install jq`)
- Traefik already running (with `traefik` Docker network created)
- DNS: `beta.bagadmenru.bzh` and `api.beta.bagadmenru.bzh` pointing to VPS IP
- A GitHub fine-grained PAT with `contents:read` scope on `maelgui/bagadmenru-v5`

### Step 1: Install webhook

```sh
# Download from https://github.com/adnanh/webhook/releases
# Or on Debian/Ubuntu:
apt install webhook
```

### Step 2: Create directory structure

```sh
mkdir -p /opt/bagadmenru-deploy /opt/bagadmenru-beta
```

### Step 3: Bootstrap deploy scripts

Download the latest release to get the deploy scripts and compose files:

```sh
# Set your GitHub PAT
export GITHUB_TOKEN="<your-pat>"

# Find the latest release tag
LATEST_TAG=$(curl -sf \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/maelgui/bagadmenru-v5/releases/latest" \
  | jq -r '.tag_name')

echo "Latest release: ${LATEST_TAG}"

# Download and extract to beta dir
ASSET_URL=$(curl -sf \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/maelgui/bagadmenru-v5/releases/tags/${LATEST_TAG}" \
  | jq -r '.assets[] | select(.name=="deploy.tar.gz") | .url')

curl -sfL \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/octet-stream" \
  "$ASSET_URL" -o /tmp/deploy.tar.gz

tar -xzf /tmp/deploy.tar.gz -C /opt/bagadmenru-beta/
rm /tmp/deploy.tar.gz
```

Copy the deploy script:

```sh
cp /opt/bagadmenru-beta/deploy/deploy.sh /opt/bagadmenru-deploy/
cp /opt/bagadmenru-beta/deploy/hooks.json /opt/bagadmenru-deploy/
chmod +x /opt/bagadmenru-deploy/deploy.sh
```

### Step 4: Configure beta environment

Create `/opt/bagadmenru-beta/.env` from the example:

```sh
cp /opt/bagadmenru-beta/deploy/.env.beta.example /opt/bagadmenru-beta/.env
```

Edit it with real values (see `deploy/.env.beta.example` for all fields). Key values:

```sh
IMAGE_TAG=<the-latest-tag-from-step-3>
GITHUB_TOKEN=<your-github-pat>
BACKEND_DATABASE_PASSWORD=$(openssl rand -base64 32)
TOKEN_SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)
```

### Step 5: Start services

```sh
cd /opt/bagadmenru-beta
docker compose -f docker-compose.base.yml -f docker-compose.beta.yml -p bagadmenru-beta pull
docker compose -f docker-compose.base.yml -f docker-compose.beta.yml -p bagadmenru-beta up -d
```

### Step 6: Verify

```sh
docker compose -p bagadmenru-beta ps
docker compose -p bagadmenru-beta logs backend

curl -I https://beta.bagadmenru.bzh
curl -I https://api.beta.bagadmenru.bzh/api/v1/utils/health
```

### Step 7: Set up webhook with Traefik

Generate a deploy token:
```sh
DEPLOY_TOKEN=$(openssl rand -hex 32)
echo "Save this: ${DEPLOY_TOKEN}"
```

Create the systemd service:
```sh
cat > /etc/systemd/system/bagadmenru-webhook.service << EOF
[Unit]
Description=Bagadmenru deploy webhook
After=network.target docker.service

[Service]
Type=simple
Environment=DEPLOY_TOKEN=<your-token>
ExecStart=/usr/bin/webhook -hooks /opt/bagadmenru-deploy/hooks.json -port 9000 -verbose
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now bagadmenru-webhook
```

Route through Traefik using the file provider. Add to your Traefik command:
```
--providers.file.directory=/etc/traefik/dynamic
```

Create `/etc/traefik/dynamic/webhook.yml`:
```yaml
http:
  routers:
    webhook:
      rule: "Host(`webhook.vps-02.maelgui.fr`)"
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver
      service: webhook
  services:
    webhook:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:9000"
```

> Note: Use `host.docker.internal` or the host's Docker bridge IP to reach the webhook systemd service from Traefik's container.

### Step 8: Configure GitHub repo secret

In GitHub repo settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `DEPLOY_WEBHOOK_URL` | `https://webhook.vps-02.maelgui.fr/hooks/deploy?token=<DEPLOY_TOKEN>` |

### Step 9: Test auto-deploy

Push a commit to `main`. The CI pipeline should:
1. Build and push images
2. Create a GitHub Release
3. Curl the webhook
4. Beta updates automatically

Check: `journalctl -u bagadmenru-webhook -f`

---

## Day-to-Day Operations

### Promote beta to prod

```sh
# Find the deploy tag beta is running:
grep IMAGE_TAG /opt/bagadmenru-beta/.env
# IMAGE_TAG=deploy-20260414-153000-abc1234

# Deploy the same tag to prod:
/opt/bagadmenru-deploy/deploy.sh prod deploy-20260414-153000-abc1234
```

Or via webhook:
```sh
curl -X POST "https://webhook.vps-02.maelgui.fr/hooks/deploy?token=<TOKEN>&env=prod&tag=deploy-20260414-153000-abc1234"
```

### Rollback

```sh
/opt/bagadmenru-deploy/deploy.sh beta deploy-20260413-120000-def5678
```

### View logs

```sh
docker compose -p bagadmenru-beta logs -f backend
docker compose -p bagadmenru-prod logs -f backend
```

### Restart a service

```sh
docker compose -p bagadmenru-beta restart backend
```

### Check what's deployed

```sh
grep IMAGE_TAG /opt/bagadmenru-beta/.env
grep IMAGE_TAG /opt/bagadmenru-prod/.env
```

---

## Secrets Reference

| Secret | Where | Purpose |
|---|---|---|
| `DEPLOY_WEBHOOK_URL` | GitHub repo secrets | Webhook URL with token |
| `DEPLOY_TOKEN` | VPS systemd unit | Webhook auth |
| `GITHUB_TOKEN` | `.env` on VPS | GitHub PAT for downloading releases |
| `.env` (beta) | `/opt/bagadmenru-beta/.env` | All beta config + credentials |
| `.env` (prod) | `/opt/bagadmenru-prod/.env` | All prod config + credentials |

### VPS directory structure

```
/opt/
├── bagadmenru-deploy/
│   ├── deploy.sh
│   └── hooks.json
├── bagadmenru-beta/
│   ├── .env
│   ├── docker-compose.base.yml
│   ├── docker-compose.beta.yml
│   ├── docker-compose.prod.yml
│   └── opa/
└── bagadmenru-prod/
    ├── .env
    ├── docker-compose.base.yml
    ├── docker-compose.beta.yml
    ├── docker-compose.prod.yml
    └── opa/
```
