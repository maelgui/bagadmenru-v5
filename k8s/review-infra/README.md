# Review Apps — One-Time Setup

Ephemeral per-PR deployments (GitLab "Review Apps" style). Label a PR with
`review-app` and CI deploys the branch to `https://pr-<n>.review.bagadmenru.bzh`
in its own namespace (`bagadmenru-pr-<n>`) with its own PostgreSQL, MinIO and
Mailpit. Closing the PR or removing the label tears it down; the nightly
reaper additionally expires any review app not redeployed within 72h
(`TTL_HOURS` in the workflows), even on open PRs.

## Architecture

| Concern | Choice |
|---|---|
| Isolation | One namespace per PR; the `k8s/base` stack is self-contained (postgres included) |
| URL | `pr-<n>.review.bagadmenru.bzh` (+ `s3-pr-<n>.…` for MinIO presigned URLs) |
| TLS | Per-host certs via the existing `letsencrypt-prod` issuer (HTTP-01) |
| Email | In-namespace Mailpit — never sends real email |
| Storage | In-namespace MinIO (emptyDir) — never touches Scaleway |
| Secrets | Random throwaway values, generated on first deploy, stable across redeploys |
| CI credential | `review-deployer` ServiceAccount, confined to `bagadmenru-pr-*` by a ValidatingAdmissionPolicy |
| Cleanup | Teardown on close/unlabel + nightly reaper (TTL, orphans, missed teardowns) |

## Setup steps

### 1. DNS

Add one wildcard record at your DNS provider:

```
*.review.bagadmenru.bzh.  A  <cluster ingress IP>
```

(Same IP as `beta.bagadmenru.bzh`.) The single wildcard covers both the app
hosts and the `s3-pr-<n>` MinIO hosts.

### 2. Cluster: scoped deploy credential

Requires Kubernetes >= 1.30 (ValidatingAdmissionPolicy GA — check with
`kubectl api-resources | grep validatingadmissionpolicies`). With an **admin**
kubeconfig:

```bash
kubectl apply -f k8s/review-infra/admission-policy.yaml
kubectl apply -f k8s/review-infra/rbac.yaml
```

Apply the admission policy **first** (or both together): the RBAC grants are
broad by necessity (RBAC cannot pattern-match namespace names) and the policy
is what confines the ServiceAccount to `bagadmenru-pr-*` namespaces. This is
what makes it safe to expose the credential to PR-triggered workflows — even
a PR that edits the k8s manifests to target `bagadmenru-prod` is refused by
the API server.

### 3. GitHub secrets

| Secret | Value |
|---|---|
| `KUBECONFIG_REVIEW` | `./k8s/review-infra/make-kubeconfig.sh \| base64 -w0` (run with admin kubeconfig) |
| `GHCR_PULL_TOKEN` | Fine-grained PAT with **read:packages** only — used as the in-cluster image pull secret, since the job-scoped `GITHUB_TOKEN` would expire and break pod restarts |

### 4. GitHub label

Create the `review-app` label on the repository. Applying labels requires
triage/write permission, which is what gates who can trigger a deploy.

## Day-to-day

- **Deploy**: add the `review-app` label to a PR. Every subsequent push
  redeploys. The PR gets a sticky comment with the URL; the deployment also
  shows up as a GitHub environment (`review/pr-<n>`) with a "View deployment"
  button.
- **Logins**: each review app is seeded with the E2E accounts
  (`e2e@bagadmenru.bzh`, `e2e-admin@bagadmenru.bzh`); passwords live in the
  `e2e-credentials` secret of the PR namespace.
- **Mail**: `https://pr-<n>.review.bagadmenru.bzh/_mail` (staff/admin session).
- **Teardown**: close the PR or remove the label. The reaper catches anything
  missed and expires idle apps after 72h (push or re-label to revive).

## Known limitations

- MinIO data is an emptyDir: uploaded files do not survive a MinIO pod
  restart. Fine for review purposes; the DB itself is on a PVC.
- Image tags (`pr-<n>-<sha>`) accumulate in GHCR; the existing
  `delete-package-versions` step on main only prunes untagged versions.
  Cheap to ignore, or prune tagged `pr-*` versions later if it bothers you.
- Passkeys registered on a review app are bound to its host (by design) and
  die with it.
