# Repository Guidelines

## Project Structure & Module Organization

Accord is a TypeScript CLI orchestrator for local multi-agent debates, compiled to a self-contained binary via `bun build --compile`. Source lives in `src/`, tests in `tests/`, prompt templates in `src/prompts/`, and team persona files in `src/teams/`. Generated run artifacts go to `runs/` and compiled binaries to `dist/`; treat both as output, not hand-edited source.

| File | Purpose |
|------|---------|
| `src/main.ts` | CLI entrypoint; arg parsing, wires all modules |
| `src/pipeline.ts` | 5-stage orchestration, coordinator fallback, parallel stages |
| `src/providers.ts` | Provider resolution, availability check, spawn dispatch |
| `src/prompts.ts` | Prompt string builders, template loading |
| `src/artifacts.ts` | Run dir creation, artifact path helpers, run_summary |
| `src/teams.ts` | Team preset definitions and persona prefix loader |
| `src/common.ts` | Utilities: slugify, timestamp, promptMode, log, fail |
| `src/config.ts` | `.accordrc` loader |
| `src/version.ts` | Reads `VERSION` file at startup |
| `src/prompts/*.md` | Prompt templates — compact and detailed pairs per stage |
| `src/teams/*.md` | Team persona files — one per preset |
| `tests/accord.test.ts` | Full integration test suite (Bun test runner) |
| `scripts/build.ts` | Cross-platform `bun build --compile` |

## Build, Test, and Development Commands

- `bun run src/main.ts "Recent AI coding agents"` — run a local debate with default providers
- `bun run src/main.ts --version` — print the release version from `VERSION`
- `bun test` — run the full test suite with fake provider shims (no real CLIs needed)
- `bun run tsc --noEmit` — type-check without emitting
- `bun run scripts/build.ts` — compile self-contained binaries for darwin and linux into `dist/`

## Coding Style & Naming Conventions

TypeScript strict mode, ESNext modules. Import paths use `.ts` extension explicitly. Function naming: camelCase. Two-space indentation. Explicit return types on exported functions. Use `node:fs` / `node:path` / `node:os` for file-system operations — do not use `Bun.fileSync` (it does not exist). Use `Bun.which(cmd)` for binary availability checks instead of spawning a shell. Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `ci:`.

## Testing Guidelines

Tests live in `tests/` and use the Bun test runner (`bun test`). Each test file targets a single module (e.g. `providers.test.ts`, `common.test.ts`). Integration tests in `accord.test.ts` use fake provider binaries from `tests/fixtures/fake-provider.sh` and `ACCORD_FIXED_TIMESTAMP` for deterministic artifact paths. When touching the pipeline or providers, verify with `bun test` and, if real provider CLIs are available, a manual `bun run src/main.ts "..."` run.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, and `ci:`. Keep commit subjects short and imperative. PRs should include a brief summary, the user-visible impact, and a concrete test plan with commands run. If behavior or output format changes, include a sample artifact path or CLI example.

## KISS Policy

Keep Accord small and inspectable. Prefer the smallest change that improves behavior, avoid framework-style abstractions, avoid adding many modes or knobs, and keep prompt logic readable enough to audit from the repo.

## Prompt Mode Detection

`promptMode` in `src/common.ts` lowercases the topic string and returns `detailed` if any of the following keywords appear: `analysis`, `analyse`, `analyze`, `roadmap`, `compare`, `comparison`, `audit`, `gap`, `gaps`, `launch`, `go live`, `mvp`, `strategy`, `market`, `status`, `iterate`, `plan`, `planning`, `review`, `evaluate`, `readiness`. Any other topic returns `compact`.

`loadTemplate` in `src/prompts.ts` selects the file: for `detailed` mode it looks for `src/prompts/<name>.detailed.md` and falls back to the compact file if the detailed variant is absent.

## Adding a New Prompt Template

Each stage has a compact prompt file and an optional detailed variant:

- `src/prompts/<name>.md` — required, used for compact mode and as fallback
- `src/prompts/<name>.detailed.md` — optional, loaded when topic triggers detailed mode

Filename convention: lowercase with hyphens, `.md` extension (e.g. `provider-debate.md`). To wire a new template into the pipeline, add a prompt builder function in `src/prompts.ts` and call it from the appropriate stage in `src/pipeline.ts`, following the existing pattern. Verify with `bun test` and a manual run if real provider CLIs are available.

## Environment Variable Reference

All variables can be set in `.accordrc` or in the shell environment. The config file path defaults to `<repo-root>/.accordrc` and can be overridden with `ACCORD_CONFIG_FILE`.

| Variable | Effect |
|----------|--------|
| `ACCORD_PROVIDERS` | Comma-separated list of active provider names (default: `codex,claude,gemini`) |
| `ACCORD_LLMS` | Role spec string, e.g. `codex:coordinator,claude:debater,gemini:debater` |
| `ACCORD_PROVIDER_<NAME>_STYLE` | Maps a custom provider name to a built-in runner style (`codex`, `claude`, or `gemini`) |
| `ACCORD_PROVIDER_<NAME>_BIN` | Overrides the binary command for that provider |
| `ACCORD_CONFIG_FILE` | Absolute or relative path to an alternate config file |
| `ACCORD_FIXED_TIMESTAMP` | Forces a fixed timestamp string — used in tests for deterministic run dirs |
| `ACCORD_CODEX_BIN` | Legacy binary override for the `codex` style |
| `ACCORD_CLAUDE_BIN` | Legacy binary override for the `claude` style |
| `ACCORD_GEMINI_BIN` | Legacy binary override for the `gemini` style |

`--llms` on the command line takes precedence over `ACCORD_LLMS` in `.accordrc`. The `--providers` flag and `ACCORD_PROVIDERS` env var set the default provider list when `--llms` is absent.

## Accord Skill for Agents (Claude/Gemini)

The `/accord` skill allows the current agent to orchestrate a multi-agent debate. By default, the agent acts as the **Coordinator**, managing high-level research and final synthesis, while delegating the debater roles to the `accord` binary.

### Manual Coordination Mode (Agent-Driven)

In this mode, the agent performing the skill is the source of truth for the coordinator stages.

1.  **Shared Research**: The agent reads the research prompt, generates the content, and writes it to the run directory.
2.  **Debater Delegation**: The agent calls the binary with the following flags to skip its internal coordination stages:
    - `--run-dir <dir>`: Uses the directory created by the agent.
    - `--slug <slug>`: Uses the same filename slug as the agent.
    - `--skip-research`: Tells the binary NOT to run its own research stage.
    - `--skip-synthesis`: Tells the binary NOT to run its own synthesis stage.
3.  **Final Synthesis**: After the binary completes the debater stages, the agent reads all outputs and generates the final synthesis.

### Example Command for Agents

```bash
./dist/accord-darwin-arm64 --run-dir "runs/2026-04-06-topic" --slug "topic" --skip-research --skip-synthesis --llms "codex:debater,gemini:debater" "My Topic"
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

The topic slug is derived from the first two hyphen-delimited words of the lowercased, punctuation-stripped topic string (via `topicSlug` in `src/common.ts`). The `_1` suffix in artifact names is a revision index reserved for future multi-round support.
