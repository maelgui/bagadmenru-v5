#!/bin/sh
set -e

ENV="${1:?Usage: deploy.sh <beta|prod> <deploy-tag>}"
TAG="${2:?Usage: deploy.sh <beta|prod> <deploy-tag>}"
REPO="maelgui/bagadmenru-v5"
DEPLOY_DIR="/opt/bagadmenru-${ENV}"

if [ "$ENV" != "beta" ] && [ "$ENV" != "prod" ]; then
  echo "ERROR: env must be 'beta' or 'prod', got '${ENV}'" >&2
  exit 1
fi

# Load GITHUB_TOKEN from .env
if [ -f "${DEPLOY_DIR}/.env" ]; then
  GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "${DEPLOY_DIR}/.env" | cut -d= -f2-)
fi
: "${GITHUB_TOKEN:?GITHUB_TOKEN not set in ${DEPLOY_DIR}/.env}"

cd "$DEPLOY_DIR"

echo "[$(date -Iseconds)] Deploying ${ENV} (${TAG})..."

# Download release tarball via GitHub API
ASSET_URL=$(curl -sf \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${REPO}/releases/tags/${TAG}" \
  | jq -r '.assets[] | select(.name=="deploy.tar.gz") | .url')

if [ -z "$ASSET_URL" ] || [ "$ASSET_URL" = "null" ]; then
  echo "ERROR: Could not find deploy.tar.gz in release ${TAG}" >&2
  exit 1
fi

curl -sfL \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/octet-stream" \
  "$ASSET_URL" -o deploy.tar.gz

echo "[$(date -Iseconds)] Extracting config..."
tar -xzf deploy.tar.gz
rm deploy.tar.gz

# Set the image tag in .env
if grep -q "^IMAGE_TAG=" .env 2>/dev/null; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TAG}/" .env
else
  echo "IMAGE_TAG=${TAG}" >> .env
fi

echo "[$(date -Iseconds)] Pulling images..."
docker compose -f docker-compose.base.yml -f "docker-compose.${ENV}.yml" -p "bagadmenru-${ENV}" pull

echo "[$(date -Iseconds)] Restarting services..."
docker compose -f docker-compose.base.yml -f "docker-compose.${ENV}.yml" -p "bagadmenru-${ENV}" up -d --remove-orphans

echo "[$(date -Iseconds)] Deploy ${ENV} complete (${TAG})"
