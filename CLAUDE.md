# Accord — Claude Code Session Notes

> **Note:** Keep this file in sync with `GEMINI.md` for any core logic changes (Key Files, Stage Pipeline, etc.).

Accord is a pure-bash orchestrator for local multi-agent debates.
 There is no build step and no compile phase. The product is the shell pipeline in `accord/lib/`.

## The /accord Skill

The primary way to run debates within Claude is via the `/accord` skill. This skill allows the Claude agent to act as the **Coordinator** while delegating debater roles to the binary.

```bash
/accord "Topic"
/accord --llms codex:debater,gemini:debater "Topic"
```

The agent will:
1.  **Generate Research** directly in the session.
2.  **Call the binary** to run external debaters (skipping its internal coordinator stages).
3.  **Perform Synthesis** and report the final result.

## Running and Testing

```bash
# Full smoke suite (uses fake provider shims — no real CLIs needed)
bash tests/smoke.sh

# Fastest syntax check before committing
bash -n bin/accord accord/lib/*.sh tests/smoke.sh

# Live run (requires at least one provider CLI on PATH)
./bin/accord "Recent AI coding agents"

# Role-based run
./bin/accord --llms codex:coordinator,claude:debater,gemini:debater "Best browser automation workflows"

# Print version
./bin/accord --version

# Build release archive
./scripts/package.sh
```

## Do Not Touch

- `runs/` — generated debate output, never hand-edited source
- `dist/` — release archives built by `scripts/package.sh`
- `node_modules/` — no Node dependencies; presence indicates something wrong

## Key Files

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
| `src/prompts/*.md` | Prompt templates — compact and detailed pairs per stage |
| `src/teams/*.md` | Team persona files — one per preset |
| `tests/accord.test.ts` | Full integration test suite (Bun test runner) |
| `scripts/build.ts` | Cross-platform `bun build --compile` |
| `docs/architecture.md` | Pipeline and release flow in detail |

## Stage Pipeline

```
shared_research   → <slug>_research_1.md                     (coordinator)
understanding     → <slug>_<provider>_understanding_1.md      (all debaters, parallel)
opinion           → <slug>_<provider>_opinion_1.md            (all debaters, parallel)
debate            → <slug>_<provider>_debate_1.md             (all debaters, parallel)
final_synthesis   → <slug>_final_1.md                        (coordinator)
```

`run_summary.md` is written after all stages complete.

## Provider Contract

Three built-in runner styles: `codex`, `claude`, `gemini`. Custom providers via `.accordrc`:

```bash
ACCORD_PROVIDERS=writer,critic
ACCORD_PROVIDER_WRITER_STYLE=codex
ACCORD_PROVIDER_WRITER_BIN=codex
ACCORD_PROVIDER_CRITIC_STYLE=gemini
ACCORD_PROVIDER_CRITIC_BIN=gemini
ACCORD_LLMS=writer:coordinator,critic:debater
```

## Environment Variables

| Variable | Effect |
|----------|--------|
| `ACCORD_PROVIDERS` | Comma-separated list of active provider names |
| `ACCORD_LLMS` | Role spec — `name:role,...` (e.g. `codex:coordinator,claude:debater`) |
| `ACCORD_PROVIDER_<NAME>_STYLE` | Maps a custom provider name to a built-in runner style |
| `ACCORD_PROVIDER_<NAME>_BIN` | Overrides the binary command for a provider |
| `ACCORD_CONFIG_FILE` | Path to an alternate config file (default: `<repo-root>/.accordrc`) |
| `ACCORD_FIXED_TIMESTAMP` | Forces a fixed timestamp string — used in tests |
| `ACCORD_CODEX_BIN` | Legacy binary override for the codex style |
| `ACCORD_CLAUDE_BIN` | Legacy binary override for the claude style |
| `ACCORD_GEMINI_BIN` | Legacy binary override for the gemini style |

## Prompt Mode Detection

`accord::prompt_mode` in `accord/lib/common.sh` lowercases the topic and returns `detailed` if it matches any of these keywords: `analysis`, `analyse`, `analyze`, `roadmap`, `compare`, `comparison`, `audit`, `gap`, `gaps`, `launch`, `go live`, `mvp`, `strategy`, `market`, `status`, `iterate`, `plan`, `planning`, `review`, `evaluate`, `readiness`. Otherwise returns `compact`.

Detailed mode causes `accord::template_path` to load `<name>.detailed.md` instead of `<name>.md` when that file exists.

## Coding Style

- TypeScript strict mode, ESNext modules
- `import` paths use `.ts` extension explicitly
- Function naming: camelCase
- Two-space indentation
- Explicit return types on exported functions
- Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `ci:`

## KISS Policy

Keep Accord small and inspectable. Prefer the smallest bash change that improves behavior. Avoid framework-style abstractions and new modes or knobs unless clearly necessary. Prompt logic should stay readable enough to audit from the repo.
