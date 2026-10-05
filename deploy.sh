#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/.deploy"
rm -rf "$DIST"
mkdir -p "$DIST/halloween"
rsync -a \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='.nojekyll' \
  --exclude='.deploy' \
  --exclude='.wrangler' \
  --exclude='node_modules' \
  --exclude='wrangler.jsonc' \
  --exclude='deploy.sh' \
  --exclude='.gitignore' \
  "$ROOT/" "$DIST/halloween/"
npx --yes wrangler@4 deploy
