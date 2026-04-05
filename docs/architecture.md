# Accord Architecture

## Overview

Accord is intentionally small:

- [`bin/accord`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/bin/accord) is the entrypoint
- [`accord/lib/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/lib) contains the shell helpers
- [`accord/prompts/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord/prompts) contains the stage-specific prompt assets
- [`VERSION`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/VERSION) is the single source of truth for release versioning
- [`scripts/version.sh`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/scripts/version.sh) reads and bumps the semantic version
- [`scripts/package.sh`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/scripts/package.sh) creates a small release archive in `dist/`
- [`.github/workflows/release.yml`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/.github/workflows/release.yml) publishes tagged releases to GitHub Releases and GHCR
- `runs/` stores generated markdown artifacts for each execution

There is no session model, build step, or internal TypeScript domain layer anymore. The behavior is the shell pipeline.

## Pipeline

1. Parse `--llms`, legacy role flags, and `--output`, then require a prompt.
2. Resolve role configuration in this order:
   - `--llms`
   - `.accordrc` via `ACCORD_LLMS=...`
   - legacy `--coordinator` and `--providers`
   - built-in defaults
3. Resolve configured provider names from `.accordrc`:
   - `ACCORD_PROVIDERS`
   - `ACCORD_PROVIDER_<NAME>_STYLE`
   - `ACCORD_PROVIDER_<NAME>_BIN`
   - or the default provider set when no config is present
4. Detect which requested provider commands are available.
5. Pick the coordinator:
   - use the configured coordinator if available
   - otherwise fall back to the first available provider in the requested order
6. Resolve the active debater list from the configured debaters that are available.
7. Create `runs/<timestamp>-<topic-slug>/`.
8. Run shared research once through the coordinator and write `<topic>_research_1.md`.
9. Run provider understanding files for each active debater.
10. Run provider opinion files for each debater that completed understanding.
11. Run one debate revision per debater after reading peer opinions.
12. Run final synthesis through the coordinator and write `<topic>_final_1.md`.
13. Write `run_summary.md` with roles, provider styles, artifact names, and summary cost/token placeholders.
14. Read the current version through `scripts/version.sh` for `--version`, package naming, and tag validation.

## Release Flow

- CI on pull requests and pushes to `main` builds the tarball and uploads it as a workflow artifact.
- Tagging `v<version>` triggers the release workflow.
- The release workflow verifies that the tag matches `VERSION`.
- It then rebuilds the tarball, creates a GitHub Release, and publishes the same archive to GHCR as an OCI package.

If a provider fails during a provider stage, Accord logs it and continues with the remaining providers.

## Role Configuration

The preferred public syntax is:

- `codex:coordinator,claude:debater,gemini:debater`

Rules:

- exactly one coordinator must be configured
- at least one debater must be configured
- supported roles are `coordinator` and `debater`
- provider names come from config, not from a hardcoded name allowlist
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

## Provider Styles

Accord keeps only three built-in runner styles:

- `codex --search exec ...` for shared research
- `codex exec ...` for other Codex stages
- `claude -p ...`
- `gemini -p ...`

Provider names can be remapped in `.accordrc` to any of those styles with `ACCORD_PROVIDER_<NAME>_STYLE` and `ACCORD_PROVIDER_<NAME>_BIN`.
