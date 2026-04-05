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

write_provider_alias_config() {
  local path="$1"
  local fake_bin="$2"

  cat >"$path" <<EOF
ACCORD_LLMS=writer:coordinator,critic:debater
ACCORD_PROVIDERS=writer,critic
ACCORD_PROVIDER_WRITER_STYLE=codex
ACCORD_PROVIDER_WRITER_BIN=$fake_bin/codex
ACCORD_PROVIDER_CRITIC_STYLE=gemini
ACCORD_PROVIDER_CRITIC_BIN=$fake_bin/gemini
EOF
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

test_prompt_templates_encode_the_expected_guidance() {
  local tmpdir research_file understanding_file opinion_file debate_file final_file
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  research_file="$tmpdir/research.md"
  understanding_file="$tmpdir/understanding.md"
  opinion_file="$tmpdir/opinion.md"
  debate_file="$tmpdir/debate.md"
  final_file="$tmpdir/final.md"

  cat >"$research_file" <<'EOF'
# Research

- Fact: something useful
EOF
  cat >"$understanding_file" <<'EOF'
# Understanding

- Fact: something useful
EOF
  cat >"$opinion_file" <<'EOF'
# Opinion

- Answer: something useful
EOF
  cat >"$debate_file" <<'EOF'
# Debate

- Revision: something useful
EOF
  cat >"$final_file" <<'EOF'
# Final

- Answer: something useful
EOF

  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "Prompt topic" "prompt-topic")" "reuse without re-reading the sources"
  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "Prompt topic" "prompt-topic")" "short source list"
  assert_text_contains "$(accord::provider_understanding_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file")" "main tension"
  assert_text_contains "$(accord::provider_understanding_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file")" "say when the research is thin"
  assert_text_contains "$(accord::provider_opinion_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file")" "start with the answer or recommendation in one sentence"
  assert_text_contains "$(accord::provider_opinion_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file")" "avoid repeating the shared research"
  assert_text_contains "$(accord::provider_debate_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$opinion_file" "$debate_file")" "only changes the parts of your answer"
  assert_text_contains "$(accord::provider_debate_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$opinion_file" "$debate_file")" "if nothing changes, say that plainly"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "one or two sentences"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "do not repeat them line by line"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-00Z-recent-ai"

  assert_file "$run_dir/recent-ai_research_1.md"
  assert_file "$run_dir/recent-ai_claude_understanding_1.md"
  assert_file "$run_dir/recent-ai_gemini_understanding_1.md"
  assert_file "$run_dir/recent-ai_claude_opinion_1.md"
  assert_file "$run_dir/recent-ai_gemini_opinion_1.md"
  assert_file "$run_dir/recent-ai_claude_debate_1.md"
  assert_file "$run_dir/recent-ai_gemini_debate_1.md"
  assert_file "$run_dir/recent-ai_final_1.md"
  assert_missing "$run_dir/recent-ai_codex_understanding_1.md"
  assert_missing "$run_dir/recent-ai_codex_opinion_1.md"
  assert_missing "$run_dir/recent-ai_codex_debate_1.md"

  assert_contains "$run_dir/recent-ai_research_1.md" "Shared research"
  assert_contains "$run_dir/recent-ai_final_1.md" "Final synthesis"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-01Z-missing-claude"

  assert_text_contains "$output" "Missing providers: claude"
  assert_file "$run_dir/missing-claude_research_1.md"
  assert_file "$run_dir/missing-claude_gemini_opinion_1.md"
  assert_missing "$run_dir/missing-claude_codex_opinion_1.md"
  assert_missing "$run_dir/missing-claude_claude_opinion_1.md"
  assert_file "$run_dir/missing-claude_final_1.md"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-02Z-gemini-only"

  assert_text_contains "$output" "Coordinator codex is unavailable; falling back to gemini"
  assert_file "$run_dir/gemini-only_research_1.md"
  assert_file "$run_dir/gemini-only_gemini_understanding_1.md"
  assert_file "$run_dir/gemini-only_final_1.md"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-03Z-ordered-roles"

  assert_text_contains "$output" "Coordinator: codex"
  assert_text_contains "$output" "Debaters: gemini, claude"
  assert_file "$run_dir/ordered-roles_research_1.md"
  assert_file "$run_dir/ordered-roles_gemini_understanding_1.md"
  assert_file "$run_dir/ordered-roles_claude_understanding_1.md"
  assert_missing "$run_dir/ordered-roles_codex_understanding_1.md"
  assert_file "$run_dir/ordered-roles_gemini_debate_1.md"
  assert_file "$run_dir/ordered-roles_claude_debate_1.md"
  assert_missing "$run_dir/ordered-roles_codex_debate_1.md"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-04Z-config-roles"

  assert_text_contains "$output" "Coordinator: gemini"
  assert_text_contains "$output" "Debaters: codex"
  assert_file "$run_dir/config-roles_research_1.md"
  assert_file "$run_dir/config-roles_codex_understanding_1.md"
  assert_missing "$run_dir/config-roles_gemini_understanding_1.md"
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

  run_dir="$tmpdir/runs/2026-04-05T12-00-05Z-flag-beats"

  assert_text_contains "$output" "Coordinator: codex"
  assert_text_contains "$output" "Debaters: claude"
  assert_file "$run_dir/flag-beats_claude_understanding_1.md"
  assert_missing "$run_dir/flag-beats_codex_understanding_1.md"
  assert_missing "$run_dir/flag-beats_gemini_understanding_1.md"
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

test_llms_flag_allows_coordinator_to_also_be_debater() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-06Z" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,codex:debater,gemini:debater" "Read code" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-06Z-read-code"

  assert_text_contains "$output" "Coordinator: codex"
  assert_text_contains "$output" "Debaters: codex, gemini"
  assert_file "$run_dir/read-code_research_1.md"
  assert_file "$run_dir/read-code_codex_understanding_1.md"
  assert_file "$run_dir/read-code_gemini_understanding_1.md"
  assert_file "$run_dir/read-code_codex_opinion_1.md"
  assert_file "$run_dir/read-code_gemini_opinion_1.md"
  assert_file "$run_dir/read-code_codex_debate_1.md"
  assert_file "$run_dir/read-code_gemini_debate_1.md"
  assert_file "$run_dir/read-code_final_1.md"
}

test_configured_provider_aliases_reuse_builtin_styles() {
  local tmpdir fake_bin config_path output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  config_path="$tmpdir/.accordrc"
  make_fake_bin "$fake_bin" codex gemini
  write_provider_alias_config "$config_path" "$fake_bin"

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CONFIG_FILE="$config_path" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-07Z" \
      "$SCRIPT" --output "$tmpdir/runs" "Alias config example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-07Z-alias-config"

  assert_text_contains "$output" "Coordinator: writer"
  assert_text_contains "$output" "Debaters: critic"
  assert_file "$run_dir/alias-config_research_1.md"
  assert_file "$run_dir/alias-config_critic_understanding_1.md"
  assert_file "$run_dir/alias-config_critic_opinion_1.md"
  assert_file "$run_dir/alias-config_critic_debate_1.md"
  assert_file "$run_dir/alias-config_final_1.md"
  assert_missing "$run_dir/alias-config_writer_understanding_1.md"
}

test_long_prompt_is_compacted_into_safe_run_and_artifact_names() {
  local tmpdir fake_bin prompt run_dir run_name research_file research_name
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini
  prompt="read code from /Users/diegoamaya/Documents/ale_mora/projects/accord-cli all files understand the market check reddit and propose missing features while keeping the tool simple powerful elegant and reliable for open source users"
  prompt="$prompt $prompt $prompt"

  PATH="$fake_bin:$PATH" \
    ACCORD_CODEX_BIN="$fake_bin/codex" \
    ACCORD_CLAUDE_BIN="$fake_bin/claude" \
    ACCORD_GEMINI_BIN="$fake_bin/gemini" \
    ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-06Z" \
    "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:debater,gemini:debater" "$prompt" >/dev/null

  run_dir="$(find "$tmpdir/runs" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [ -n "$run_dir" ] || fail "expected one run directory for long prompt"

  run_name="$(basename "$run_dir")"
  [ "$run_name" = "2026-04-05T12-00-06Z-read-code" ] || fail "expected two-word run directory name, got $run_name"

  research_file="$(find "$run_dir" -maxdepth 1 -name '*_research_1.md' | head -n 1)"
  assert_file "$research_file"
  research_name="$(basename "$research_file")"
  [ "$research_name" = "read-code_research_1.md" ] || fail "expected two-word artifact name, got $research_name"
}

main() {
  # shellcheck source=../accord/lib/common.sh
  . "$ROOT/accord/lib/common.sh"
  # shellcheck source=../accord/lib/prompts.sh
  . "$ROOT/accord/lib/prompts.sh"
  test_prompt_templates_encode_the_expected_guidance
  test_full_run_creates_expected_artifacts
  test_missing_provider_continues_with_available_ones
  test_missing_default_coordinator_falls_back_to_available_provider
  test_llms_flag_assigns_roles_and_preserves_order
  test_accordrc_defaults_are_used_when_llms_flag_missing
  test_llms_flag_overrides_config_defaults
  test_invalid_llms_spec_fails_fast
  test_llms_flag_allows_coordinator_to_also_be_debater
  test_configured_provider_aliases_reuse_builtin_styles
  test_long_prompt_is_compacted_into_safe_run_and_artifact_names
  echo "smoke tests passed"
}

main "$@"
