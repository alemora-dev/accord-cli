# Accord Architecture

## Overview

Accord is intentionally small:

- [`bin/accord`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/bin/accord) is the entrypoint
- [`accord/lib/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/lib) contains the shell helpers
- [`accord/prompts/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/prompts) contains the stage-specific prompt assets
- `runs/` stores generated markdown artifacts for each execution

There is no session model, build step, or internal TypeScript domain layer anymore. The behavior is the shell pipeline.

## Pipeline

1. Parse `--coordinator`, `--providers`, and `--output`, then require a prompt.
2. Detect which requested CLIs are available.
3. Pick the coordinator:
   - use the requested or default coordinator if available
   - otherwise fall back to the first available provider when the coordinator was not explicitly chosen
4. Create `runs/<timestamp>-<topic-slug>/`.
5. Run shared research once through the coordinator and write `<topic>_research_1.md`.
6. Run provider understanding files for each available provider.
7. Run provider opinion files for each provider that completed understanding.
8. Run one debate revision per provider after reading peer opinions.
9. Run final synthesis through the coordinator and write `<topic>_final_1.md`.

If a provider fails during a provider stage, Accord logs it and continues with the remaining providers.

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
