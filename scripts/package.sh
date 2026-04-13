#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$("$ROOT/scripts/version.sh" current)"
DIST_DIR="${ACCORD_DIST_DIR:-$ROOT/dist}"

mkdir -p "$DIST_DIR"

# Package each platform binary into its own tar.gz
for binary in "$DIST_DIR"/accord-*; do
  [ -f "$binary" ] || continue
  name="$(basename "$binary")"
  archive="$DIST_DIR/$name-$VERSION.tar.gz"
  staging="$(mktemp -d "${TMPDIR:-/tmp}/accord-package.XXXXXX")"
  trap 'rm -rf "$staging"' EXIT
  cp "$binary" "$staging/accord"
  cp "$ROOT/README.md" "$ROOT/VERSION" "$staging/"
  tar -czf "$archive" -C "$staging" .
  printf '%s\n' "$archive"
done
