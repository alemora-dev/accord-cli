#!/usr/bin/env bash

accord::provider_key() {
  printf '%s' "$1" | tr '[:lower:]-' '[:upper:]_'
}

accord::provider_legacy_bin_var_name() {
  case "$1" in
    codex) printf 'ACCORD_CODEX_BIN' ;;
    claude) printf 'ACCORD_CLAUDE_BIN' ;;
    gemini) printf 'ACCORD_GEMINI_BIN' ;;
    *) printf '' ;;
  esac
}

accord::configured_provider_names() {
  local configured="${ACCORD_PROVIDERS:-codex,claude,gemini}"
  local -a providers=()
  local provider

  IFS=',' read -r -a providers <<<"$configured"

  for provider in "${providers[@]}"; do
    provider="$(accord::trim "$provider")"
    [ -n "$provider" ] && printf '%s\n' "$provider"
  done
}

accord::provider_style_supported() {
  case "$1" in
    codex|claude|gemini) return 0 ;;
    *) return 1 ;;
  esac
}

accord::provider_style() {
  local provider="$1"
  local key
  local variable_name
  local style=""

  key="$(accord::provider_key "$provider")"
  variable_name="ACCORD_PROVIDER_${key}_STYLE"
  style="${!variable_name:-}"

  if [ -n "$style" ]; then
    printf '%s' "$style"
    return
  fi

  if accord::provider_style_supported "$provider"; then
    printf '%s' "$provider"
    return
  fi

  printf '%s' ''
}

accord::provider_command() {
  local provider="$1"
  local key
  local variable_name
  local style
  local legacy_var_name

  key="$(accord::provider_key "$provider")"
  variable_name="ACCORD_PROVIDER_${key}_BIN"
  if [ -n "${!variable_name:-}" ]; then
    printf '%s' "${!variable_name}"
    return
  fi

  style="$(accord::provider_style "$provider")"
  legacy_var_name="$(accord::provider_legacy_bin_var_name "$style")"
  if [ -n "$legacy_var_name" ] && [ -n "${!legacy_var_name:-}" ]; then
    printf '%s' "${!legacy_var_name}"
    return
  fi

  [ -n "$style" ] || accord::fail "Unsupported provider: $provider"
  printf '%s' "$style"
}

accord::provider_supported() {
  local provider="$1"
  local configured_provider
  local style

  while IFS= read -r configured_provider; do
    if [ "$configured_provider" = "$provider" ]; then
      style="$(accord::provider_style "$provider")"
      accord::provider_style_supported "$style"
      return
    fi
  done <<EOF
$(accord::configured_provider_names)
EOF

  return 1
}

accord::provider_available() {
  local command_name
  command_name="$(accord::provider_command "$1")"
  command -v "$command_name" >/dev/null 2>&1
}

accord::run_provider() {
  local provider="$1"
  local prompt="$2"
  local output_file="$3"
  local mode="$4"
  local run_dir="$5"
  local command_name
  local style

  command_name="$(accord::provider_command "$provider")"
  style="$(accord::provider_style "$provider")"
  rm -f "$output_file"

  case "$style" in
    codex)
      if [ "$mode" = "shared_research" ]; then
        "$command_name" --search exec --skip-git-repo-check -C "$run_dir" -o "$output_file" "$prompt" >/dev/null
      else
        "$command_name" exec --skip-git-repo-check -C "$run_dir" -o "$output_file" "$prompt" >/dev/null
      fi
      ;;
    claude)
      "$command_name" -p --output-format text "$prompt" >"$output_file"
      ;;
    gemini)
      "$command_name" -p "$prompt" >"$output_file"
      ;;
    *)
      accord::fail "Unsupported provider style: $style"
      ;;
  esac

  [ -s "$output_file" ]
}
