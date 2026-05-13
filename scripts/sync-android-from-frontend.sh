#!/usr/bin/env bash
# From monorepo root (directory containing frontend/ and backend/), refresh
# backend/android from frontend/android so mobile stays aligned with frontend/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
rsync -a --delete \
  --exclude node_modules \
  --exclude .expo \
  --exclude dist \
  --exclude web-build \
  --exclude '.DS_Store' \
  "$ROOT/frontend/android/" "$ROOT/backend/android/"
echo "Synced $ROOT/frontend/android/ -> $ROOT/backend/android/"
