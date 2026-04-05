#!/usr/bin/env bash

accord::usage() {
  cat <<'EOF'
Usage: accord [--llms <role-list>] [--coordinator <provider>] [--providers <csv>] [--output <dir>] "prompt"

Default providers: codex,claude,gemini
Default coordinator: codex

Examples:
  accord "Recent AI coding agents"
  accord --llms codex:coordinator,claude:debater,gemini:debater "State of local-first coding tools"
  accord --providers codex,gemini "State of local-first coding tools"
  accord --coordinator gemini --output ./runs "Best browser automation workflows"
EOF
}

accord::log() {
  printf '[accord] %s\n' "$*" >&2
}

accord::fail() {
  accord::log "$*"
  exit 1
}

accord::slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

accord::timestamp() {
  if [ -n "${ACCORD_FIXED_TIMESTAMP:-}" ]; then
    printf '%s' "$ACCORD_FIXED_TIMESTAMP"
    return
  fi

  date -u '+%Y-%m-%dT%H-%M-%SZ'
}

accord::join_by() {
  local separator="$1"
  shift
  local first=1
  local value

  for value in "$@"; do
    if [ "$first" -eq 1 ]; then
      printf '%s' "$value"
      first=0
    else
      printf '%s%s' "$separator" "$value"
    fi
  done
}

accord::read_file() {
  local path="$1"

  if [ -f "$path" ]; then
    cat "$path"
  fi
}

accord::trim() {
  printf '%s' "$1" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}
