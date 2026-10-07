#!/usr/bin/env bash
# Seal the DrumScore Studio licence into SealedSecrets for both namespaces.
#
# Run this from a machine that can reach the k3s API (your admin kubeconfig,
# or the readonly tunnel) — the agent sandbox cannot keep an SSH port-forward
# alive across commands, so this step is manual.
#
# It never reads any live Secret: `kubeseal --raw` only needs the controller's
# PUBLIC cert, and seals name+namespace-scoped values locally. The licence
# value is read from your untracked .env, not hard-coded here.
#
# Prerequisites:
#   - kubeseal + kubectl on PATH
#   - a kubeconfig that reaches the cluster (readonly is enough for --fetch-cert)
#   - the .env holding DSE_LICENSE_VERSION / DSE_LICENSE_CONTENT
set -euo pipefail

ENV_FILE="${1:-$HOME/Repos/bagadmenru-v5-worktrees/mscz-pdf-export/.env}"
OVERLAYS_DIR="${2:-$HOME/Repos/bagadmenru-v5-worktrees/renderers-deploy/k8s/overlays}"

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
: "${DSE_LICENSE_VERSION:?missing in $ENV_FILE}"
: "${DSE_LICENSE_CONTENT:?missing in $ENV_FILE}"

CERT="$(mktemp)"
trap 'rm -f "$CERT"' EXIT
kubeseal --fetch-cert \
  --controller-name sealed-secrets \
  --controller-namespace kube-system > "$CERT"

seal_one() {
  local ns="$1" out="$2"
  local ver content
  ver="$(printf %s "$DSE_LICENSE_VERSION" \
    | kubeseal --raw --cert "$CERT" --scope strict \
        --namespace "$ns" --name drumscore-license)"
  content="$(printf %s "$DSE_LICENSE_CONTENT" \
    | kubeseal --raw --cert "$CERT" --scope strict \
        --namespace "$ns" --name drumscore-license)"
  cat >> "$out" <<EOF
---
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: drumscore-license
  namespace: ${ns}
spec:
  encryptedData:
    DSE_LICENSE_VERSION: ${ver}
    DSE_LICENSE_CONTENT: ${content}
  template:
    metadata:
      name: drumscore-license
      namespace: ${ns}
    type: Opaque
EOF
  echo "Sealed drumscore-license into ${out} (ns=${ns})"
}

seal_one bagadmenru-beta "$OVERLAYS_DIR/beta/sealed-secrets.yaml"
seal_one bagadmenru-prod "$OVERLAYS_DIR/prod/sealed-secrets.yaml"

echo "Done. Review the diff, then commit the two sealed-secrets.yaml files."
