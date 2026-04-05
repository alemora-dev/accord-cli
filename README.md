# Accord

Accord is a small bash orchestrator for local multi-agent debate runs.

The coordinator, `codex` by default, does one shared web-research pass, writes a single research markdown file, then fans the same topic out to the available provider CLIs. Each provider writes an understanding note, an opinion, and one debate revision after reading peer opinions. The coordinator then writes the final synthesis.

## Usage

Run the repo-local entrypoint:

```bash
./bin/accord "Recent AI coding agents"
```

Optional flags:

```bash
./bin/accord --coordinator gemini --providers codex,gemini --output ./runs "Best browser automation workflows"
```

To expose it as `accord` on your shell path:

```bash
ln -s "$PWD/bin/accord" /usr/local/bin/accord
```

## Expected local CLIs

Accord looks for these commands by default:

- `codex`
- `claude`
- `gemini`

You can override the executable path for each one with:

- `ACCORD_CODEX_BIN`
- `ACCORD_CLAUDE_BIN`
- `ACCORD_GEMINI_BIN`

If a provider is missing, Accord reports it and continues with the ones that are available. If the default coordinator `codex` is missing, Accord falls back to the first available provider unless `--coordinator` explicitly requested something unavailable.

## Run Layout

Each run writes to `runs/<timestamp>-<topic-slug>/`.

Artifacts follow this shape:

- `<topic>_research_1.md`
- `<topic>_<provider>_understanding_1.md`
- `<topic>_<provider>_opinion_1.md`
- `<topic>_<provider>_debate_1.md`
- `<topic>_final_1.md`

Prompt assets and shell helpers live under [`accord/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord).

## Development

Smoke tests:

```bash
bash tests/smoke.sh
```

Core docs:

- [`docs/architecture.md`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/docs/architecture.md)
- [`docs/testing.md`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/docs/testing.md)
