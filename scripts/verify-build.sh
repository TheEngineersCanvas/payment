#!/usr/bin/env bash
set -euo pipefail

echo "=== Type check ==="
bun run check-types

echo "=== Lint ==="
bun run lint

echo "=== Tests ==="
bun run test

echo "=== Build ==="
bun run build

echo "=== Verify exports ==="
[ -f dist/index.js ] || { echo "ERROR: dist/index.js missing"; exit 1; }
[ -f dist/index.cjs ] || { echo "ERROR: dist/index.cjs missing"; exit 1; }
[ -f dist/index.d.ts ] || { echo "ERROR: dist/index.d.ts missing"; exit 1; }

echo "=== Verify no src/ leaks in dist/ ==="
if grep -r "src/" dist/*.d.ts 2>/dev/null; then
  echo "ERROR: dist/ declarations reference src/ paths"
  exit 1
fi

echo "=== All checks passed ==="
