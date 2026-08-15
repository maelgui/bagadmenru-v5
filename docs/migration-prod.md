# Migration: Docker Compose → K8s Production

This runbook migrates the existing production deployment (running via `docker-compose.prod.yml` on a separate machine) to the K3s cluster in namespace `bagadmenru-prod`.

## Prerequisites

- Access to the **old prod machine** (where docker-compose is running)
- `kubectl` configured for the K3s cluster (same cluster as beta)
- `kubeseal` CLI installed
- The `sealed-secrets` controller running in the cluster

## Overview

1. Prepare the K8s prod namespace & secrets
2. Export PostgreSQL data from docker-compose
3. Deploy the K8s prod stack (empty DB)
4. Import the database dump
5. Verify & switch DNS
6. Decommission the old machine

---

## Step 1: Prepare K8s namespace & secrets

```bash
# Create the namespace
kubectl create namespace bagadmenru-prod

# Create GHCR image pull secret
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=maelgui \
  --docker-password=<GITHUB_PAT_WITH_READ_PACKAGES> \
  -n bagadmenru-prod
```

### Seal the secrets

Use the same values from your `.env` on the old machine:

```bash
# Backend secrets
kubectl create secret generic backend-secrets \
  --namespace=bagadmenru-prod \
  --from-literal=SECRET_KEY='<value>' \
  --from-literal=JWT_SECRET_KEY='<value>' \
  --from-literal=TOKEN_SECRET_KEY='<value>' \
  --from-literal=S3_ACCESS_KEY_ID='<value>' \
  --from-literal=S3_SECRET_ACCESS_KEY='<value>' \
  --from-literal=SMTP_PASSWORD='<value>' \
  --from-literal=IMAP_PASSWORD='<value>' \
  --from-literal=OVH_APPLICATION_KEY='<value>' \
  --from-literal=OVH_APPLICATION_SECRET='<value>' \
  --from-literal=OVH_CONSUMER_KEY='<value>' \
  --from-literal=VAPID_PRIVATE_KEY='<value>' \
  --from-literal=VAPID_PUBLIC_KEY='<value>' \
  --dry-run=client -o yaml | kubeseal --format yaml > k8s/overlays/prod/sealed-secrets.yaml

# Postgres secrets (append)
kubectl create secret generic postgres-secrets \
  --namespace=bagadmenru-prod \
  --from-literal=POSTGRES_PASSWORD='<value>' \
  --dry-run=client -o yaml | kubeseal --format yaml >> k8s/overlays/prod/sealed-secrets.yaml
```

Commit and push the updated `sealed-secrets.yaml`.

---

## Step 2: Export PostgreSQL data from docker-compose

On the **old prod machine**:

```bash
# Create a full database dump
docker compose -f docker-compose.prod.yml exec backend-postgres \
  pg_dump -U bagadmenru -Fc bagadmenru > bagadmenru_prod_$(date +%Y%m%d).dump

# Copy to your local machine (or directly to the K3s node)
scp user@old-machine:~/bagadmenru_prod_*.dump /tmp/
```

---

## Step 3: Deploy only PostgreSQL first

Deploy only the postgres StatefulSet — **not** the backend yet (to avoid the init container running migrations on an empty DB):

```bash
# Apply the full overlay but then scale backend to 0
kubectl apply -k k8s/overlays/prod
kubectl scale deployment/backend -n bagadmenru-prod --replicas=0
kubectl scale deployment/frontend -n bagadmenru-prod --replicas=0

# Wait for postgres to be ready
kubectl rollout status statefulset/postgres -n bagadmenru-prod --timeout=120s
```

---

## Step 4: Import the database dump

```bash
# Copy dump into the postgres pod
kubectl cp /tmp/bagadmenru_prod_*.dump \
  bagadmenru-prod/postgres-0:/tmp/bagadmenru.dump

# Drop the existing (empty) database and recreate it
kubectl exec -n bagadmenru-prod postgres-0 -- \
  psql -U bagadmenru -d postgres -c "DROP DATABASE IF EXISTS bagadmenru;"
kubectl exec -n bagadmenru-prod postgres-0 -- \
  psql -U bagadmenru -d postgres -c "CREATE DATABASE bagadmenru OWNER bagadmenru;"

# Restore the dump into the fresh database
kubectl exec -n bagadmenru-prod postgres-0 -- \
  pg_restore -U bagadmenru -d bagadmenru --no-owner --no-privileges /tmp/bagadmenru.dump

# Clean up
kubectl exec -n bagadmenru-prod postgres-0 -- rm /tmp/bagadmenru.dump
```

### Verify data

```bash
kubectl exec -n bagadmenru-prod postgres-0 -- \
  psql -U bagadmenru -d bagadmenru -c "\dt"

kubectl exec -n bagadmenru-prod postgres-0 -- \
  psql -U bagadmenru -d bagadmenru -c "SELECT count(*) FROM member;"
```

---

## Step 5: Start the backend (migrations will run on restored data)

```bash
# Scale backend back up — the init container will run `alembic upgrade head`
# which is a no-op if the DB is already at the latest migration
kubectl scale deployment/backend -n bagadmenru-prod --replicas=1
kubectl scale deployment/frontend -n bagadmenru-prod --replicas=1

kubectl rollout status deployment/backend -n bagadmenru-prod --timeout=120s
kubectl rollout status deployment/frontend -n bagadmenru-prod --timeout=120s

# Verify health
kubectl exec -n bagadmenru-prod deploy/backend -- \
  curl -sf http://localhost:8000/api/v1/health
```

---

## Step 6: Switch DNS

Update your DNS records to point to the K3s cluster:

| Record | Old value | New value |
|--------|-----------|-----------|
| `prod.bagadmenru.bzh` | Old machine IP | K3s node IP |
| `api.prod.bagadmenru.bzh` | Old machine IP | K3s node IP |

Wait for DNS propagation and verify:

```bash
curl -sf https://api.prod.bagadmenru.bzh/api/v1/health
curl -sf https://prod.bagadmenru.bzh
```

---

## Step 7: Decommission old machine

Once everything is confirmed working:

```bash
# On the old machine — stop services
docker compose -f docker-compose.prod.yml down

# Keep the data volume for a few weeks as safety net
# Then remove when confident:
# docker volume rm <project>_backend-pgdata
```

---

## Step 8: Configure GitHub Environment

In GitHub repo → Settings → Environments:

1. Create environment: **prod**
2. Add secret: `KUBECONFIG` (base64-encoded kubeconfig for the K3s cluster)
3. (Optional) Add **required reviewers** for manual approval before each prod deploy

After this, every push to `main` that passes E2E tests will automatically deploy to prod.

---

## Rollback

If something goes wrong after the switch:

```bash
# Point DNS back to old machine
# Restart the old docker-compose stack:
ssh user@old-machine
docker compose -f docker-compose.prod.yml up -d
```
