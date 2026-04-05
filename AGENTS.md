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
