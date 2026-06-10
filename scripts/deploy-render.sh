#!/usr/bin/env bash
set -euo pipefail

# Simple deploy helper: build worker image, push to GHCR, (optional) trigger Render deploy via API.
# Requires environment variables:
#   GHCR_OWNER (github username or org)
#   GHCR_TOKEN (personal access token with repo:packages)
#   RENDER_SERVICE_ID (optional, to trigger a render deploy)
#   RENDER_API_KEY (optional)

OWNER=${GHCR_OWNER:-"<owner>"}
IMAGE_NAME=${IMAGE_NAME:-"momentreel-worker"}
TAG=${TAG:-$(git rev-parse --short HEAD || echo latest)}
IMAGE=ghcr.io/${OWNER}/${IMAGE_NAME}:${TAG}

echo "Building Docker image ${IMAGE}..."
docker build -t ${IMAGE} -f docker/worker/Dockerfile .

if [ -z "${GHCR_TOKEN:-}" ]; then
  echo "GHCR_TOKEN not set. Set GHCR_TOKEN and GHCR_OWNER to push to GHCR." >&2
  exit 1
fi

echo "Logging in to GHCR..."
echo ${GHCR_TOKEN} | docker login ghcr.io -u ${OWNER} --password-stdin

echo "Pushing image to GHCR..."
docker push ${IMAGE}

echo "Image pushed: ${IMAGE}"

if [ -n "${RENDER_SERVICE_ID:-}" ] && [ -n "${RENDER_API_KEY:-}" ]; then
  echo "Triggering Render deploy for service ${RENDER_SERVICE_ID}..."
  curl -sS -X POST \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"serviceId":"'${RENDER_SERVICE_ID}'","image":"'${IMAGE}'"}' \
    https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys
  echo "Triggered Render deploy (check Render dashboard for status)."
else
  echo "RENDER_SERVICE_ID or RENDER_API_KEY not set — skipping Render deploy trigger."
  echo "Go to Render dashboard and set the service image to: ${IMAGE} or configure auto-deploy from GHCR."
fi

echo "Done."
