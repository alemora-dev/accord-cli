# Accord CLI

Accord is a local-first TypeScript CLI for structured multi-agent research debates. It coordinates local provider CLIs, runs an explicit `independent -> cross-review -> consensus` flow, and keeps the project shaped like a real extensible tool rather than a one-off orchestration script.

## What it does

- Runs a guided CLI flow for launching a debate topic.
- Supports built-in provider adapters for `codex`, `claude`, and `gemini`.
- Persists sessions locally so runs can be resumed later.
- Produces deterministic consensus summaries from provider findings.
- Exports consensus results as Markdown.

## Main commands

- `accord`
  Starts the interactive debate session.
- `accord setup`
  Detects available local providers and offers to launch a session.
- `accord resume <sessionId>`
  Loads a saved session from disk and reports its status.

## Current architecture

- `src/domain`
  Core debate, round, and consensus models plus orchestration services.
- `src/application`
  Use-case boundaries such as running debates, setup, and resume flows.
- `src/providers`
  Abstract provider contracts, built-in adapters, and prompt builders.
- `src/infrastructure`
  Filesystem, process execution, config loading, export, and persistence.
- `tests`
  Unit, contract, and integration coverage.

More detail lives in:

- `docs/architecture.md`
- `docs/provider-authoring.md`
- `docs/session-model.md`
- `docs/testing.md`

## Development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Status

This version is a strong scaffold for the full product:

- provider execution contracts are in place
- orchestration is implemented with fake-backed tests
- the guided shell and launch gate exist
- the docs and export layer are present

The next likely iteration is richer provider-output presentation and fuller setup/session UX.
