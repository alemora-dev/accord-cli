# Repository Guidelines

## Project Structure & Module Organization
`bin/accord` is the repo-local entrypoint. Core runtime logic lives in `accord/lib/*.sh`, and stage prompts live in `accord/prompts/*.md`. Tests are shell smoke tests in `tests/`, with provider shims under `tests/fixtures/`. Reference docs live in `docs/`, release metadata is in `VERSION`, and `scripts/package.sh` creates release archives in `dist/`. Generated run artifacts go to `runs/`; treat `runs/` and `dist/` as output, not hand-edited source.

## Build, Test, and Development Commands
There is no compile step; the product is the shell pipeline.

- `./bin/accord "Recent AI coding agents"` runs a local debate with default providers.
- `./bin/accord --version` prints the release version from `VERSION`.
- `bash tests/smoke.sh` runs the full smoke suite with fake provider binaries.
- `./scripts/package.sh` builds `dist/accord-<version>.tar.gz`.
- `bash -n bin/accord accord/lib/*.sh tests/smoke.sh` is the fastest syntax check before committing.

## Coding Style & Naming Conventions
Write POSIX-friendly Bash with `#!/usr/bin/env bash` and `set -euo pipefail`. Prefer small functions, local variables, and fully quoted expansions. Existing library functions use the `accord::name` pattern; keep new helpers in that style. Use two-space indentation inside functions and keep filenames lowercase with hyphens or underscores to match current files such as `provider-opinion.md` and `smoke.sh`.

## Testing Guidelines
Coverage is behavior-focused through `tests/smoke.sh`, not a unit-test runner. Add or extend `test_*` shell functions for each behavior change, especially around CLI flags, `.accordrc` loading, provider fallback, and artifact generation. When touching prompts or orchestration stages, verify both `bash tests/smoke.sh` and at least one manual run of `./bin/accord ...` if real provider CLIs are available.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:`, `docs:`, and `ci:`. Keep commit subjects short and imperative. PRs should include a brief summary, the user-visible impact, and a concrete test plan with commands run. If behavior or output format changes, include a sample artifact path or CLI example instead of screenshots.

## KISS Policy
Keep Accord small and inspectable. Prefer the smallest bash change that improves behavior, avoid framework-style abstractions, avoid adding many modes or knobs, and keep prompt logic readable enough to audit from the repo.

## Prompt Mode Detection

`accord::prompt_mode` in `accord/lib/common.sh` lowercases the topic string and pattern-matches it. If any of the following keywords appear, it returns `detailed` and the runtime loads the `.detailed.md` variant of each prompt template: `analysis`, `analyse`, `analyze`, `roadmap`, `compare`, `comparison`, `audit`, `gap`, `gaps`, `launch`, `go live`, `mvp`, `strategy`, `market`, `status`, `iterate`, `plan`, `planning`, `review`, `evaluate`, `readiness`. Any other topic returns `compact`.

`accord::template_path` in `accord/lib/prompts.sh` selects the file: for `detailed` mode it looks for `accord/prompts/<name>.detailed.md` and falls back to the compact file if the detailed variant is absent.

## Adding a New Prompt Template

Each stage has a compact prompt file and an optional detailed variant:

- `accord/prompts/<name>.md` — required, used for compact mode and as fallback
- `accord/prompts/<name>.detailed.md` — optional, loaded when topic triggers detailed mode

Filename convention: lowercase with hyphens, `.md` extension (e.g. `provider-debate.md`). To wire a new template into the pipeline, add a case to `accord::run_stage_for_providers` in `accord/lib/pipeline.sh` and a corresponding prompt builder function in `accord/lib/prompts.sh` following the existing pattern. Verify with `bash tests/smoke.sh` and a manual run if real provider CLIs are available.

## Environment Variable Reference

All variables can be set in `.accordrc` or in the shell environment. The config file path defaults to `<repo-root>/.accordrc` and can be overridden with `ACCORD_CONFIG_FILE`.

| Variable | Effect |
|----------|--------|
| `ACCORD_PROVIDERS` | Comma-separated list of active provider names (default: `codex,claude,gemini`) |
| `ACCORD_LLMS` | Role spec string, e.g. `codex:coordinator,claude:debater,gemini:debater` |
| `ACCORD_PROVIDER_<NAME>_STYLE` | Maps a custom provider name to a built-in runner style (`codex`, `claude`, or `gemini`) |
| `ACCORD_PROVIDER_<NAME>_BIN` | Overrides the binary command for that provider |
| `ACCORD_CONFIG_FILE` | Absolute or relative path to an alternate config file |
| `ACCORD_FIXED_TIMESTAMP` | Forces a fixed timestamp string — used in smoke tests for deterministic run dirs |
| `ACCORD_CODEX_BIN` | Legacy binary override for the `codex` style |
| `ACCORD_CLAUDE_BIN` | Legacy binary override for the `claude` style |
| `ACCORD_GEMINI_BIN` | Legacy binary override for the `gemini` style |

`--llms` on the command line takes precedence over `ACCORD_LLMS` in `.accordrc`. Legacy `--coordinator` and `--providers` flags are still accepted but only apply when `--llms` is absent and no `.accordrc` LLMS entry is set.

## Accord Skill for Agents (Claude/Gemini)

The `/accord` skill allows the current agent to orchestrate a multi-agent debate. By default, the agent acts as the **Coordinator**, managing high-level research and final synthesis, while delegating the debater roles to the `accord` binary.

### Manual Coordination Mode (Agent-Driven)

In this mode, the agent performing the skill is the source of truth for the coordinator stages.

1.  **Shared Research**: The agent reads the research prompt, generates the content, and writes it to the run directory.
2.  **Debater Delegation**: The agent calls `./bin/accord` with the following flags to skip its internal coordination stages:
    - `--run-dir <dir>`: Uses the directory created by the agent.
    - `--slug <slug>`: Uses the same filename slug as the agent.
    - `--skip-research`: Tells the binary NOT to run its own research stage.
    - `--skip-synthesis`: Tells the binary NOT to run its own synthesis stage.
3.  **Final Synthesis**: After the binary completes the debater stages, the agent reads all outputs and generates the final synthesis.

### Example Command for Agents

```bash
./bin/accord --run-dir "runs/2026-04-06-topic" --slug "topic" --skip-research --skip-synthesis --llms "codex:debater,gemini:debater" "My Topic"
```

### Running as a Subagent

The `/accord` skill is fully compatible with background subagents. When a subagent is started to run a debate:
- The subagent becomes the "Coordinator".
- It handles the research and synthesis in its own session context.
- It reports the final synthesis result back to the main agent upon completion.

## Stage Pipeline and Artifact Naming

Five stages run in order for each debate:

| Stage | Who runs it | Output file |
|-------|-------------|-------------|
| `shared_research` | Coordinator only | `<slug>_research_1.md` |
| `provider_understanding` | All active debaters (parallel) | `<slug>_<provider>_understanding_1.md` |
| `provider_opinion` | Debaters that completed understanding (parallel) | `<slug>_<provider>_opinion_1.md` |
| `provider_debate` | Debaters that completed opinion (parallel) | `<slug>_<provider>_debate_1.md` |
| `final_synthesis` | Coordinator only | `<slug>_final_1.md` |

`run_summary.md` is written after all stages complete and lists coordinator, debaters, provider styles, artifact names, and placeholder token/cost fields.

The topic slug is derived from the first two hyphen-delimited words of the lowercased, punctuation-stripped topic string (via `accord::topic_slug`). The `_1` suffix in artifact names is a revision index reserved for future multi-round support.
