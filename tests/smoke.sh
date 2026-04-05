#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/bin/accord"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_file() {
  [ -f "$1" ] || fail "expected file $1"
}

assert_missing() {
  [ ! -e "$1" ] || fail "did not expect $1"
}

assert_contains() {
  local path="$1"
  local needle="$2"
  grep -Fq "$needle" "$path" || fail "expected '$needle' in $path"
}

assert_text_contains() {
  local text="$1"
  local needle="$2"
  printf '%s' "$text" | grep -Fq "$needle" || fail "expected output to contain '$needle'"
}

write_config_file() {
  local path="$1"
  local llms="$2"

  printf 'ACCORD_LLMS=%s\n' "$llms" >"$path"
}

make_fake_bin() {
  local destination="$1"
  shift

  mkdir -p "$destination"
  for provider in "$@"; do
    cp "$ROOT/tests/fixtures/fake-provider.sh" "$destination/$provider"
    chmod +x "$destination/$provider"
  done
}

test_full_run_creates_expected_artifacts() {
  local tmpdir fake_bin run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini

  PATH="$fake_bin:$PATH" \
    ACCORD_CODEX_BIN="$fake_bin/codex" \
    ACCORD_CLAUDE_BIN="$fake_bin/claude" \
    ACCORD_GEMINI_BIN="$fake_bin/gemini" \
    ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-00Z" \
    "$SCRIPT" --output "$tmpdir/runs" "Recent AI coding agents" >/dev/null

  run_dir="$tmpdir/runs/2026-04-05T12-00-00Z-recent-ai-coding-agents"

  assert_file "$run_dir/recent-ai-coding-agents_research_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_understanding_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_understanding_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_opinion_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_opinion_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_debate_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_debate_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_final_1.md"
  assert_missing "$run_dir/recent-ai-coding-agents_codex_understanding_1.md"
  assert_missing "$run_dir/recent-ai-coding-agents_codex_opinion_1.md"
  assert_missing "$run_dir/recent-ai-coding-agents_codex_debate_1.md"

  assert_contains "$run_dir/recent-ai-coding-agents_research_1.md" "Shared research"
  assert_contains "$run_dir/recent-ai-coding-agents_final_1.md" "Final synthesis"
}

test_missing_provider_continues_with_available_ones() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-01Z" \
      "$SCRIPT" --output "$tmpdir/runs" "Missing Claude example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-01Z-missing-claude-example"

  assert_text_contains "$output" "Missing providers: claude"
  assert_file "$run_dir/missing-claude-example_research_1.md"
  assert_file "$run_dir/missing-claude-example_gemini_opinion_1.md"
  assert_missing "$run_dir/missing-claude-example_codex_opinion_1.md"
  assert_missing "$run_dir/missing-claude-example_claude_opinion_1.md"
  assert_file "$run_dir/missing-claude-example_final_1.md"
}

test_missing_default_coordinator_falls_back_to_available_provider() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-02Z" \
      "$SCRIPT" --output "$tmpdir/runs" "Gemini only example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-02Z-gemini-only-example"

  assert_text_contains "$output" "Coordinator codex is unavailable; falling back to gemini"
  assert_file "$run_dir/gemini-only-example_research_1.md"
  assert_file "$run_dir/gemini-only-example_gemini_understanding_1.md"
  assert_file "$run_dir/gemini-only-example_final_1.md"
}

test_llms_flag_assigns_roles_and_preserves_order() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-03Z" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,gemini:debater,claude:debater" "Ordered roles example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-03Z-ordered-roles-example"

  assert_text_contains "$output" "Coordinator: codex"
  assert_text_contains "$output" "Debaters: gemini, claude"
  assert_file "$run_dir/ordered-roles-example_research_1.md"
  assert_file "$run_dir/ordered-roles-example_gemini_understanding_1.md"
  assert_file "$run_dir/ordered-roles-example_claude_understanding_1.md"
  assert_missing "$run_dir/ordered-roles-example_codex_understanding_1.md"
  assert_file "$run_dir/ordered-roles-example_gemini_debate_1.md"
  assert_file "$run_dir/ordered-roles-example_claude_debate_1.md"
  assert_missing "$run_dir/ordered-roles-example_codex_debate_1.md"
}

test_accordrc_defaults_are_used_when_llms_flag_missing() {
  local tmpdir fake_bin output run_dir config_path
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  config_path="$tmpdir/.accordrc"
  make_fake_bin "$fake_bin" codex claude gemini
  write_config_file "$config_path" "gemini:coordinator,codex:debater"

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_CONFIG_FILE="$config_path" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-04Z" \
      "$SCRIPT" --output "$tmpdir/runs" "Config roles example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-04Z-config-roles-example"

  assert_text_contains "$output" "Coordinator: gemini"
  assert_text_contains "$output" "Debaters: codex"
  assert_file "$run_dir/config-roles-example_research_1.md"
  assert_file "$run_dir/config-roles-example_codex_understanding_1.md"
  assert_missing "$run_dir/config-roles-example_gemini_understanding_1.md"
}

test_llms_flag_overrides_config_defaults() {
  local tmpdir fake_bin output run_dir config_path
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  config_path="$tmpdir/.accordrc"
  make_fake_bin "$fake_bin" codex claude gemini
  write_config_file "$config_path" "gemini:coordinator,codex:debater"

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_CONFIG_FILE="$config_path" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-05Z" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:debater" "Flag beats config" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-05Z-flag-beats-config"

  assert_text_contains "$output" "Coordinator: codex"
  assert_text_contains "$output" "Debaters: claude"
  assert_file "$run_dir/flag-beats-config_claude_understanding_1.md"
  assert_missing "$run_dir/flag-beats-config_codex_understanding_1.md"
  assert_missing "$run_dir/flag-beats-config_gemini_understanding_1.md"
}

test_invalid_llms_spec_fails_fast() {
  local tmpdir fake_bin output
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini

  set +e
  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:judge" "Bad roles" 2>&1
  )"
  status=$?
  set -e

  [ "$status" -ne 0 ] || fail "expected invalid --llms to fail"
  assert_text_contains "$output" "Unsupported LLM role"
}

main() {
  test_full_run_creates_expected_artifacts
  test_missing_provider_continues_with_available_ones
  test_missing_default_coordinator_falls_back_to_available_provider
  test_llms_flag_assigns_roles_and_preserves_order
  test_accordrc_defaults_are_used_when_llms_flag_missing
  test_llms_flag_overrides_config_defaults
  test_invalid_llms_spec_fails_fast
  echo "smoke tests passed"
}

main "$@"
