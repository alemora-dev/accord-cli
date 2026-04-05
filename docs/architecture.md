# Accord Architecture

## Overview

Accord is intentionally small:

- [`bin/accord`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/bin/accord) is the entrypoint
- [`accord/lib/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/lib) contains the shell helpers
- [`accord/prompts/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/prompts) contains the stage-specific prompt assets
- `runs/` stores generated markdown artifacts for each execution

There is no session model, build step, or internal TypeScript domain layer anymore. The behavior is the shell pipeline.

## Pipeline

1. Parse `--llms`, legacy role flags, and `--output`, then require a prompt.
2. Resolve role configuration in this order:
   - `--llms`
   - `.accordrc` via `ACCORD_LLMS=...`
   - legacy `--coordinator` and `--providers`
   - built-in defaults
3. Detect which requested CLIs are available.
4. Pick the coordinator:
   - use the configured coordinator if available
   - otherwise fall back to the first available provider in the requested order
5. Resolve the active debater list from the configured debaters that are available.
6. Create `runs/<timestamp>-<topic-slug>/`.
7. Run shared research once through the coordinator and write `<topic>_research_1.md`.
8. Run provider understanding files for each active debater.
9. Run provider opinion files for each debater that completed understanding.
10. Run one debate revision per debater after reading peer opinions.
11. Run final synthesis through the coordinator and write `<topic>_final_1.md`.

If a provider fails during a provider stage, Accord logs it and continues with the remaining providers.

## Role Configuration

The preferred public syntax is:

- `codex:coordinator,claude:debater,gemini:debater`

Rules:

- exactly one coordinator must be configured
- at least one debater must be configured
- supported roles are `coordinator` and `debater`
- provider order is preserved
- if only the promoted fallback coordinator remains available, it may also act as the sole debater so the run still works

## Prompt Strategy

Each stage has a versioned markdown prompt file in [`accord/prompts/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/prompts). The runtime appends stage metadata plus the relevant artifact contents:

- topic
- topic slug
- provider or coordinator identity
- shared research
- own opinion
- peer opinions
- final artifact bundle

This keeps the orchestration code small while leaving prompt behavior easy to edit.

## CLI Invocation

The default non-interactive invocations are:

- `codex --search exec ...` for shared research
- `codex exec ...` for other Codex stages
- `claude -p ...`
- `gemini -p ...`

You can override binary paths with `ACCORD_CODEX_BIN`, `ACCORD_CLAUDE_BIN`, and `ACCORD_GEMINI_BIN`.
