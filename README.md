# Accord

Accord is a small bash orchestrator for local multi-agent debate runs.

The coordinator, `codex` by default, does one shared web-research pass, writes a single research markdown file, then fans the same topic out to the available provider CLIs. Each provider writes an understanding note, an opinion, and one debate revision after reading peer opinions. The coordinator then writes the final synthesis.

The prompt set is tuned for short, bullet-first artifacts so each file is easier to scan without turning the workflow into a rigid schema.

## Usage

Run the repo-local entrypoint:

```bash
./bin/accord "Recent AI coding agents"
```

Primary role-order configuration:

```bash
./bin/accord --llms codex:coordinator,claude:debater,gemini:debater "Best browser automation workflows"
```

Optional defaults file:

```bash
cat .accordrc
 # ACCORD_PROVIDERS=codex,claude,gemini
# ACCORD_LLMS=codex:coordinator,claude:debater,gemini:debater
```

Legacy flags still work when `--llms` is omitted and no `.accordrc` is present:

```bash
./bin/accord --coordinator gemini --providers codex,gemini --output ./runs "Best browser automation workflows"
```

To expose it as `accord` on your shell path:

```bash
ln -s "$PWD/bin/accord" /usr/local/bin/accord
```

## Provider Contract

Accord keeps a tiny provider contract in `.accordrc`:

- `ACCORD_PROVIDERS=codex,claude,gemini`
- `ACCORD_PROVIDER_<NAME>_STYLE=<codex|claude|gemini>`
- `ACCORD_PROVIDER_<NAME>_BIN=<command>`

That lets you define custom provider names while still reusing the built-in runner styles. Example:

```bash
ACCORD_PROVIDERS=writer,critic
ACCORD_PROVIDER_WRITER_STYLE=codex
ACCORD_PROVIDER_WRITER_BIN=codex
ACCORD_PROVIDER_CRITIC_STYLE=gemini
ACCORD_PROVIDER_CRITIC_BIN=gemini
ACCORD_LLMS=writer:coordinator,critic:debater
```

If no provider config is present, Accord defaults to:

- `codex`
- `claude`
- `gemini`

Legacy binary overrides still work for the built-in styles:

- `ACCORD_CODEX_BIN`
- `ACCORD_CLAUDE_BIN`
- `ACCORD_GEMINI_BIN`

If a provider is missing, Accord reports it and continues with the ones that are available. With role-based config, Accord keeps the configured coordinator when possible and otherwise falls back to the first available provider in the requested order.

## Roles And Defaults

Accord now supports a small role-aware config layer:

- `--llms` accepts an ordered list like `codex:coordinator,claude:debater,gemini:debater`
- `.accordrc` can define `ACCORD_LLMS=...` for repo defaults
- `--llms` overrides `.accordrc`
- coordinator and debaters are treated as separate roles by default
- if the configured coordinator is unavailable, Accord promotes the first available provider and keeps going

## Run Layout

Each run writes to `runs/<timestamp>-<topic-slug>/`.

Artifacts follow this shape:

- `<topic>_research_1.md`
- `<topic>_<provider>_understanding_1.md`
- `<topic>_<provider>_opinion_1.md`
- `<topic>_<provider>_debate_1.md`
- `<topic>_final_1.md`
- `run_summary.md`

With the default `.accordrc`, `codex` coordinates and `claude` plus `gemini` produce the debater artifacts.

`run_summary.md` is a small transparency file with the coordinator, debaters, provider styles, artifact list, and placeholder token/cost fields.

Prompt assets and shell helpers live under [`accord/`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/accord).

## Development

Smoke tests:

```bash
bash tests/smoke.sh
```

Core docs:

- [`docs/architecture.md`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/docs/architecture.md)
- [`docs/testing.md`](/Users/diegoamaya/Documents/ale_mora/projects/accord-cli/docs/testing.md)
