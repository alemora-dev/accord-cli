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
  assert_file "$run_dir/recent-ai-coding-agents_codex_understanding_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_understanding_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_understanding_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_codex_opinion_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_opinion_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_opinion_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_codex_debate_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_claude_debate_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_gemini_debate_1.md"
  assert_file "$run_dir/recent-ai-coding-agents_final_1.md"

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
  assert_file "$run_dir/missing-claude-example_codex_opinion_1.md"
  assert_file "$run_dir/missing-claude-example_gemini_opinion_1.md"
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

main() {
  test_full_run_creates_expected_artifacts
  test_missing_provider_continues_with_available_ones
  test_missing_default_coordinator_falls_back_to_available_provider
  echo "smoke tests passed"
}

main "$@"
