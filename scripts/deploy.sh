#!/usr/bin/env bash
# Build the Peru's Taste Astro site and deploy its static output to a Forge site.
#
# Usage:
#   ./scripts/deploy.sh                  # default: preview (deploy.env)
#   ./scripts/deploy.sh --staging        # staging (deploy.staging.env)
#   ./scripts/deploy.sh --prod           # production (deploy.prod.env)
#   DEPLOY_ENV=<mode> ./scripts/deploy.sh
#
# Each env file MAY set:
#   REMOTE_FOLDER  — destination subfolder (preview) OR "." (deploys to site root)
#   REMOTE_BASE    — Forge site's public/ path on the server
#   PUBLIC_URL     — the URL that should return 200 after rsync (used for verification)
#   ASTRO_BASE     — exported to the build so Astro's `base` matches the served path
#   PUBLIC_*       — any PUBLIC_-prefixed env exported to the build

set -euo pipefail

MODE="${DEPLOY_ENV:-preview}"
[ "${1:-}" = "--prod" ]    && MODE="prod"
[ "${1:-}" = "--staging" ] && MODE="staging"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/deploy.env"
[ "$MODE" != "preview" ] && ENV_FILE="$ROOT/deploy.$MODE.env"
[ -f "$ENV_FILE" ] || { echo "error: missing $ENV_FILE" >&2; exit 1; }

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a
: "${REMOTE_FOLDER:?$ENV_FILE must set REMOTE_FOLDER}"

REMOTE_USER="forge"
REMOTE_HOST="${REMOTE_HOST:-157.230.201.211}"
REMOTE_BASE="${REMOTE_BASE:-/home/forge/perus-taste.on-forge.com/storage/app/frontend}"
DEST="${REMOTE_BASE%/}/${REMOTE_FOLDER#/}"

echo "==> Building (ASTRO_BASE=${ASTRO_BASE:-/perus-taste/})"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm exec astro build

echo "==> Deploying to ${REMOTE_HOST}:${DEST}"
rsync -avz --delete --exclude='.gitignore' "$ROOT/dist/" "$REMOTE_USER@$REMOTE_HOST:$DEST/"

if [ -n "${POST_RSYNC_CMD:-}" ]; then
  echo "==> Post-rsync: $POST_RSYNC_CMD"
  ssh "$REMOTE_USER@$REMOTE_HOST" "$POST_RSYNC_CMD"
fi

if [ -n "${PUBLIC_URL:-}" ]; then
  echo "==> Verifying ${PUBLIC_URL}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$PUBLIC_URL" || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "✓ Live: $PUBLIC_URL"
  else
    echo "⚠ HTTP $STATUS — check the deploy" >&2
  fi
fi
