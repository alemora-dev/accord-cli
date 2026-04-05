#!/usr/bin/env bash

accord::provider_bin_var_name() {
  case "$1" in
    codex) printf 'ACCORD_CODEX_BIN' ;;
    claude) printf 'ACCORD_CLAUDE_BIN' ;;
    gemini) printf 'ACCORD_GEMINI_BIN' ;;
    *) printf 'ACCORD_UNKNOWN_BIN' ;;
  esac
}

accord::provider_command() {
  local provider="$1"
  local variable_name

  variable_name="$(accord::provider_bin_var_name "$provider")"
  if [ "$variable_name" != "ACCORD_UNKNOWN_BIN" ] && [ -n "${!variable_name:-}" ]; then
    printf '%s' "${!variable_name}"
    return
  fi

  printf '%s' "$provider"
}

accord::provider_supported() {
  case "$1" in
    codex|claude|gemini) return 0 ;;
    *) return 1 ;;
  esac
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

  command_name="$(accord::provider_command "$provider")"
  rm -f "$output_file"

  case "$provider" in
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
      accord::fail "Unsupported provider: $provider"
      ;;
  esac

  [ -s "$output_file" ]
}
