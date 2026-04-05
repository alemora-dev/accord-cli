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

assert_empty_or_missing() {
  [ ! -e "$1" ] || [ ! -s "$1" ] || fail "expected $1 to be empty or missing"
}

assert_contains() {
  local path="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$path" || fail "expected '$needle' in $path"
}

assert_text_contains() {
  local text="$1"
  local needle="$2"
  printf '%s' "$text" | grep -Fq -- "$needle" || fail "expected output to contain '$needle'"
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  [ "$expected" = "$actual" ] || fail "expected '$expected', got '$actual'"
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
  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "Prompt topic" "prompt-topic")" "one short lead line, then 4 to 6 bullets"
  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "Prompt topic" "prompt-topic")" "Sources list in plain markdown bullets"
  assert_text_contains "$(accord::provider_understanding_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file")" "3 bullets max"
  assert_text_contains "$(accord::provider_understanding_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file")" "say when the research is thin"
  assert_text_contains "$(accord::provider_opinion_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file")" "start with the answer or recommendation in one sentence"
  assert_text_contains "$(accord::provider_opinion_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file")" "exactly 3 bullets"
  assert_text_contains "$(accord::provider_debate_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$opinion_file" "$debate_file")" "2 to 4 bullets only"
  assert_text_contains "$(accord::provider_debate_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$opinion_file" "$debate_file")" "if nothing changes, say that plainly"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "best final answer in one sentence"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "exactly 3 bullets for agreement, caveat, and next action"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "Prompt topic" "prompt-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "do not repeat them line by line"
}

test_prompt_mode_expands_for_analysis_heavy_requests() {
  local tmpdir research_file understanding_file opinion_file debate_file
  local complex_topic simple_topic
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  research_file="$tmpdir/research.md"
  understanding_file="$tmpdir/understanding.md"
  opinion_file="$tmpdir/opinion.md"
  debate_file="$tmpdir/debate.md"
  simple_topic="What is the color of the sky?"
  complex_topic="Compare the current status with the old analysis and give me a recent analysis, roadmap, launch gaps, MVP blockers, and next steps for Europe go-live."

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

  assert_equals "compact" "$(accord::prompt_mode "$simple_topic")"
  assert_equals "detailed" "$(accord::prompt_mode "$complex_topic")"
  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "$complex_topic" "complex-topic")" "## Summary"
  assert_text_contains "$(accord::shared_research_prompt "$ROOT" "$complex_topic" "complex-topic")" "## Key Findings"
  assert_text_contains "$(accord::provider_understanding_prompt "$ROOT" "$complex_topic" "complex-topic" "codex" "$research_file")" "## What Matters"
  assert_text_contains "$(accord::provider_opinion_prompt "$ROOT" "$complex_topic" "complex-topic" "codex" "$research_file" "$understanding_file")" "## Recommendation"
  assert_text_contains "$(accord::provider_debate_prompt "$ROOT" "$complex_topic" "complex-topic" "codex" "$research_file" "$opinion_file" "$debate_file")" "## What Changed"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "$complex_topic" "complex-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "## Bottom Line"
  assert_text_contains "$(accord::final_synthesis_prompt "$ROOT" "$complex_topic" "complex-topic" "codex" "$research_file" "$understanding_file" "$opinion_file" "$debate_file")" "## Recommended Next Steps"
}

test_version_flag_prints_version_and_help_mentions_it() {
  local version_output help_output

  version_output="$("$SCRIPT" --version)"
  help_output="$("$SCRIPT" --help)"

  assert_equals "0.1.0" "$version_output"
  assert_text_contains "$help_output" "--version"
}

test_version_script_reads_calculates_and_bumps_versions() {
  local tmpdir current next_patch next_minor next_major bumped
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  printf '1.2.3\n' >"$tmpdir/VERSION"

  current="$(
    ACCORD_VERSION_ROOT="$tmpdir" \
      "$ROOT/scripts/version.sh" current
  )"
  next_patch="$(
    ACCORD_VERSION_ROOT="$tmpdir" \
      "$ROOT/scripts/version.sh" next patch
  )"
  next_minor="$(
    ACCORD_VERSION_ROOT="$tmpdir" \
      "$ROOT/scripts/version.sh" next minor
  )"
  next_major="$(
    ACCORD_VERSION_ROOT="$tmpdir" \
      "$ROOT/scripts/version.sh" next major
  )"
  bumped="$(
    ACCORD_VERSION_ROOT="$tmpdir" \
      "$ROOT/scripts/version.sh" bump patch
  )"

  assert_equals "1.2.3" "$current"
  assert_equals "1.2.4" "$next_patch"
  assert_equals "1.3.0" "$next_minor"
  assert_equals "2.0.0" "$next_major"
  assert_equals "1.2.4" "$bumped"
  assert_contains "$tmpdir/VERSION" "1.2.4"
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

test_run_summary_describes_roles_styles_and_artifacts() {
  local tmpdir fake_bin run_dir summary_file
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
  summary_file="$run_dir/run_summary.md"

  assert_file "$summary_file"
  assert_contains "$summary_file" "Coordinator: codex"
  assert_contains "$summary_file" "Debaters: claude, gemini"
  assert_contains "$summary_file" "codex -> codex"
  assert_contains "$summary_file" "claude -> claude"
  assert_contains "$summary_file" "gemini -> gemini"
  assert_contains "$summary_file" "recent-ai_research_1.md"
  assert_contains "$summary_file" "recent-ai_final_1.md"
  assert_contains "$summary_file" "Token estimate: unknown"
  assert_contains "$summary_file" "Cost estimate: unknown"
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

test_understanding_stage_runs_providers_in_parallel() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-08Z" \
      FAKE_SYNC_STAGE="provider_understanding" \
      FAKE_SYNC_DIR="$tmpdir/sync" \
      FAKE_SYNC_PROVIDERS="claude,gemini" \
      FAKE_SYNC_TIMEOUT_STEPS="20" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:debater,gemini:debater" "Parallel understanding" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-08Z-parallel-understanding"

  assert_text_contains "$output" "Debaters: claude, gemini"
  assert_file "$run_dir/parallel-understanding_claude_understanding_1.md"
  assert_file "$run_dir/parallel-understanding_gemini_understanding_1.md"
  assert_file "$run_dir/parallel-understanding_claude_opinion_1.md"
  assert_file "$run_dir/parallel-understanding_gemini_opinion_1.md"
}

test_stage_failure_drops_failed_provider_and_keeps_survivors() {
  local tmpdir fake_bin output run_dir
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude gemini

  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_GEMINI_BIN="$fake_bin/gemini" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-09Z" \
      FAKE_FAIL_PROVIDER="claude" \
      FAKE_FAIL_STAGE="provider_opinion" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:debater,gemini:debater" "Opinion failure example" 2>&1
  )"

  run_dir="$tmpdir/runs/2026-04-05T12-00-09Z-opinion-failure"

  assert_text_contains "$output" "Provider claude failed during opinion; continuing"
  assert_file "$run_dir/opinion-failure_gemini_opinion_1.md"
  assert_empty_or_missing "$run_dir/opinion-failure_claude_opinion_1.md"
  assert_file "$run_dir/opinion-failure_gemini_debate_1.md"
  assert_missing "$run_dir/opinion-failure_claude_debate_1.md"
  assert_file "$run_dir/opinion-failure_final_1.md"
}

test_stage_fails_when_all_active_providers_fail() {
  local tmpdir fake_bin output status
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"
  fake_bin="$tmpdir/fake-bin"
  make_fake_bin "$fake_bin" codex claude

  set +e
  output="$(
    PATH="$fake_bin:$PATH" \
      ACCORD_CODEX_BIN="$fake_bin/codex" \
      ACCORD_CLAUDE_BIN="$fake_bin/claude" \
      ACCORD_FIXED_TIMESTAMP="2026-04-05T12-00-10Z" \
      FAKE_FAIL_PROVIDER="claude" \
      FAKE_FAIL_STAGE="provider_understanding" \
      "$SCRIPT" --output "$tmpdir/runs" --llms "codex:coordinator,claude:debater" "All fail example" 2>&1
  )"
  status=$?
  set -e

  [ "$status" -ne 0 ] || fail "expected run to fail when every active provider fails"
  assert_text_contains "$output" "No providers completed the understanding stage."
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

test_package_script_creates_a_versioned_archive() {
  local tmpdir archive output
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/accord-smoke.XXXXXX")"

  output="$(
    ACCORD_DIST_DIR="$tmpdir/dist" \
      "$ROOT/scripts/package.sh" 2>&1
  )"

  archive="$tmpdir/dist/accord-0.1.0.tar.gz"

  assert_file "$archive"
  assert_text_contains "$output" "$archive"
  tar -tzf "$archive" | grep -Fq "accord-0.1.0/VERSION" || fail "expected VERSION in archive"
  tar -tzf "$archive" | grep -Fq "accord-0.1.0/bin/accord" || fail "expected bin/accord in archive"
  tar -tzf "$archive" | grep -Fq "accord-0.1.0/README.md" || fail "expected README.md in archive"
  tar -tzf "$archive" | grep -Fq "accord-0.1.0/docs/architecture.md" || fail "expected docs in archive"
}

test_ci_workflow_builds_and_uploads_release_archive() {
  local workflow="$ROOT/.github/workflows/ci.yml"

  assert_contains "$workflow" "Run release packaging"
  assert_contains "$workflow" "bash scripts/package.sh"
  assert_contains "$workflow" "actions/upload-artifact@v4"
  assert_contains "$workflow" "dist/accord-*.tar.gz"
  assert_contains "$workflow" "scripts/version.sh"
}

test_release_workflow_publishes_github_release_and_package() {
  local workflow="$ROOT/.github/workflows/release.yml"

  assert_file "$workflow"
  assert_contains "$workflow" "push:"
  assert_contains "$workflow" "tags:"
  assert_contains "$workflow" "v*"
  assert_contains "$workflow" "contents: write"
  assert_contains "$workflow" "packages: write"
  assert_contains "$workflow" "bash scripts/package.sh"
  assert_contains "$workflow" "softprops/action-gh-release@v2"
  assert_contains "$workflow" "dist/accord-*.tar.gz"
  assert_contains "$workflow" "oras-project/setup-oras@v1"
  assert_contains "$workflow" "ghcr.io/"
  assert_contains "$workflow" "oras push"
  assert_contains "$workflow" "scripts/version.sh current"
}

main() {
  # shellcheck source=../accord/lib/common.sh
  . "$ROOT/accord/lib/common.sh"
  # shellcheck source=../accord/lib/prompts.sh
  . "$ROOT/accord/lib/prompts.sh"
  test_prompt_templates_encode_the_expected_guidance
  test_prompt_mode_expands_for_analysis_heavy_requests
  test_full_run_creates_expected_artifacts
  test_run_summary_describes_roles_styles_and_artifacts
  test_missing_provider_continues_with_available_ones
  test_missing_default_coordinator_falls_back_to_available_provider
  test_llms_flag_assigns_roles_and_preserves_order
  test_accordrc_defaults_are_used_when_llms_flag_missing
  test_llms_flag_overrides_config_defaults
  test_invalid_llms_spec_fails_fast
  test_llms_flag_allows_coordinator_to_also_be_debater
  test_understanding_stage_runs_providers_in_parallel
  test_stage_failure_drops_failed_provider_and_keeps_survivors
  test_stage_fails_when_all_active_providers_fail
  test_configured_provider_aliases_reuse_builtin_styles
  test_long_prompt_is_compacted_into_safe_run_and_artifact_names
  test_version_flag_prints_version_and_help_mentions_it
  test_version_script_reads_calculates_and_bumps_versions
  test_package_script_creates_a_versioned_archive
  test_ci_workflow_builds_and_uploads_release_archive
  test_release_workflow_publishes_github_release_and_package
  echo "smoke tests passed"
}

main "$@"
