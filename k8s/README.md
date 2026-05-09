# Kubernetes Deployment (Kustomize)

Deploys Bagad Men Ru to a K3s cluster with Traefik ingress and cert-manager TLS.

## Structure

```
k8s/
├── base/                       # Shared manifests
│   ├── backend-deployment.yaml # Backend (init: migrations, main: uvicorn)
│   ├── backend-service.yaml
│   ├── backend-config.yaml     # Non-secret env vars (overridden per env)
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── frontend-config.yaml
│   ├── postgres.yaml           # StatefulSet + headless Service + PVC
│   ├── ingress.yaml            # Ingress (patched per env)
│   └── kustomization.yaml
├── overlays/beta/              # Beta environment
│   ├── kustomization.yaml
│   ├── sealed-secrets.yaml     # Encrypted secrets (safe to commit)
│   ├── backend-config-patch.yaml
│   ├── frontend-config-patch.yaml
│   └── ingress-patch.yaml
└── overlays/prod/              # Production environment
    ├── kustomization.yaml
    ├── sealed-secrets.yaml
    ├── backend-config-patch.yaml
    ├── frontend-config-patch.yaml
    └── ingress-patch.yaml
```

## Prerequisites (cluster setup)

```bash
# 1. Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# 2. Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: contact@bagadmenru.bzh
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: traefik
EOF

# 3. Install sealed-secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# 4. Install kubeseal CLI
brew install kubeseal
```

## Sealing Secrets

Secrets are encrypted per-environment and safe to commit to git.

```bash
# Create and seal backend secrets for beta:
kubectl create secret generic backend-secrets \
  --namespace=bagadmenru-beta \
  --from-literal=SECRET_KEY='your-value' \
  --from-literal=JWT_SECRET_KEY='your-value' \
  --from-literal=TOKEN_SECRET_KEY='your-value' \
  --from-literal=S3_ACCESS_KEY_ID='your-value' \
  --from-literal=S3_SECRET_ACCESS_KEY='your-value' \
  --from-literal=SMTP_PASSWORD='your-value' \
  --from-literal=IMAP_PASSWORD='your-value' \
  --from-literal=OVH_APPLICATION_KEY='your-value' \
  --from-literal=OVH_APPLICATION_SECRET='your-value' \
  --from-literal=OVH_CONSUMER_KEY='your-value' \
  --from-literal=VAPID_PRIVATE_KEY='your-value' \
  --from-literal=VAPID_PUBLIC_KEY='your-value' \
  --dry-run=client -o yaml | kubeseal --format yaml > k8s/overlays/beta/sealed-secrets.yaml

# Seal postgres secrets and append:
kubectl create secret generic postgres-secrets \
  --namespace=bagadmenru-beta \
  --from-literal=POSTGRES_PASSWORD='your-db-password' \
  --dry-run=client -o yaml | kubeseal --format yaml >> k8s/overlays/beta/sealed-secrets.yaml
```

## GHCR Image Pull Secret

```bash
# Create in each namespace:
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=maelgui \
  --docker-password=<GITHUB_PAT_WITH_READ_PACKAGES> \
  -n bagadmenru-beta
```

## Deploy

```bash
# Preview what will be applied:
kubectl kustomize k8s/overlays/beta

# Deploy beta:
kubectl apply -k k8s/overlays/beta

# Deploy prod:
kubectl apply -k k8s/overlays/prod

# Update image tag (e.g., after CI builds a new image):
cd k8s/overlays/beta
kustomize edit set image ghcr.io/maelgui/bagadmenru-v5/backend:new-tag
kubectl apply -k .
```
