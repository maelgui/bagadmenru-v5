---
inclusion: fileMatch
fileMatchPattern: "k8s/**,infra/**,docker-compose*,Dockerfile,**/Dockerfile"
---

# Infrastructure Conventions

## Local Development (Docker Compose)

```bash
docker compose up                # All services
docker compose up db storage mailpit -d  # Infrastructure only
docker compose up backend        # Backend with hot-reload
docker compose up frontend       # Frontend with hot-reload
```

Services and ports:
- Backend API: http://localhost:8888 (maps to container :8000)
- Frontend: http://localhost:5173
- Mailpit UI: http://localhost:8025 (SMTP on :1025)
- MinIO console: http://localhost:9090 (S3 API on :9000)
- PostgreSQL: localhost:5432 (user: postgres, password in compose file)

## Kubernetes (K3s + Kustomize)

### Structure
- `k8s/base/` — Shared manifests (deployments, services, configmaps, ingress)
- `k8s/overlays/beta/` — Beta environment patches and sealed secrets
- `k8s/overlays/prod/` — Production environment patches and sealed secrets

### Deployment Commands
```bash
kubectl kustomize k8s/overlays/beta    # Preview manifests
kubectl apply -k k8s/overlays/beta     # Deploy beta
kubectl apply -k k8s/overlays/prod     # Deploy production
```

### Key Concepts
- **Sealed Secrets**: All secrets are encrypted with `kubeseal` and safe to commit
- **Image tags**: Set via `kustomize edit set image` in overlays
- **TLS**: cert-manager with Let's Encrypt ClusterIssuer
- **Ingress**: Traefik (bundled with K3s)
- **Namespaces**: `bagadmenru-beta` and `bagadmenru-prod`

### Adding a New Secret
```bash
kubectl create secret generic <name> \
  --namespace=bagadmenru-<env> \
  --from-literal=KEY='value' \
  --dry-run=client -o yaml | kubeseal --format yaml >> k8s/overlays/<env>/sealed-secrets.yaml
```

## Terraform (Scaleway)

Location: `infra/main.tf`

Manages:
- S3 object storage buckets (with lifecycle rules and CORS)
- IAM applications and API keys for backend access
- IAM policies for bucket read/write permissions

Provider: Scaleway (`scaleway/scaleway`)

## Docker Images

Built and pushed by CI to `ghcr.io/maelgui/bagadmenru-v5/`:
- `backend:latest` and `backend:<commit-sha>`
- `frontend:latest` and `frontend:<commit-sha>`

## CI/CD Pipeline

Defined in `.github/workflows/release.yml`:
1. Lint frontend + test backend (parallel, on all PRs and pushes)
2. Build & push Docker images (on push to main only)
3. Deploy to beta via Kustomize
4. Run E2E tests against beta
5. Production deployment is manual
