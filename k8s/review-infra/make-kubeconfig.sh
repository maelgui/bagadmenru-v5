#!/usr/bin/env bash
# Build a kubeconfig for the review-deployer ServiceAccount, ready to paste
# into the KUBECONFIG_REVIEW GitHub secret (base64-encoded, same convention
# as the existing KUBECONFIG secret).
#
# Run with an admin kubeconfig, AFTER applying rbac.yaml + admission-policy.yaml:
#   ./make-kubeconfig.sh | base64 -w0   # -b0 on macOS
set -euo pipefail

SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
TOKEN=$(kubectl get secret review-deployer-token -n bagadmenru-ci -o jsonpath='{.data.token}' | base64 -d)

cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: k3s
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA}
users:
  - name: review-deployer
    user:
      token: ${TOKEN}
contexts:
  - name: review-deployer@k3s
    context:
      cluster: k3s
      user: review-deployer
current-context: review-deployer@k3s
EOF
