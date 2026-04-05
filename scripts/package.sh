#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$("$ROOT/scripts/version.sh" current)"
DIST_DIR="${ACCORD_DIST_DIR:-$ROOT/dist}"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/accord-package.XXXXXX")"
PACKAGE_ROOT="$STAGING_DIR/accord-$VERSION"
ARCHIVE="$DIST_DIR/accord-$VERSION.tar.gz"

trap 'rm -rf "$STAGING_DIR"' EXIT

mkdir -p "$DIST_DIR"
mkdir -p "$PACKAGE_ROOT"
cp -R "$ROOT/bin" "$ROOT/accord" "$ROOT/README.md" "$ROOT/docs" "$ROOT/VERSION" "$PACKAGE_ROOT/"
tar -czf "$ARCHIVE" -C "$STAGING_DIR" "accord-$VERSION"
printf '%s\n' "$ARCHIVE"
