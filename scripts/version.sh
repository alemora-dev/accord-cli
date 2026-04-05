#!/usr/bin/env bash
set -euo pipefail

ROOT="${ACCORD_VERSION_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
VERSION_FILE="$ROOT/VERSION"

version_usage() {
  cat <<EOF
Usage: version.sh <current|next|bump> [patch|minor|major]
EOF
}

version_fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

version_current() {
  [ -f "$VERSION_FILE" ] || version_fail "Missing VERSION file: $VERSION_FILE"
  tr -d '\n' <"$VERSION_FILE"
}

version_next() {
  local current major minor patch level="${1:-patch}"

  current="$(version_current)"
  IFS='.' read -r major minor patch <<EOF
$current
EOF

  case "$level" in
    patch)
      patch=$((patch + 1))
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    *)
      version_fail "Unsupported version bump: $level"
      ;;
  esac

  printf '%s.%s.%s' "$major" "$minor" "$patch"
}

version_bump() {
  local next_version
  next_version="$(version_next "${1:-patch}")"
  printf '%s\n' "$next_version" >"$VERSION_FILE"
  printf '%s' "$next_version"
}

main() {
  case "${1:-}" in
    current)
      shift
      version_current
      ;;
    next)
      shift
      version_next "${1:-patch}"
      ;;
    bump)
      shift
      version_bump "${1:-patch}"
      ;;
    *)
      version_usage
      exit 1
      ;;
  esac
}

main "$@"
