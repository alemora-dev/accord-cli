# Testing

## Smoke suite

The rewrite uses shell smoke tests instead of a Node test runner.

Run the full suite:

```bash
bash tests/smoke.sh
```

The smoke suite uses fake `codex`, `claude`, and `gemini` shims to verify:

- run directory creation
- topic slugging and file naming
- `--llms` role parsing and ordering
- `.accordrc` default loading
- config-driven provider aliases
- `--llms` precedence over `.accordrc`
- provider auto-detection
- missing-provider continuation
- coordinator fallback when `codex` is unavailable
- invalid role validation
- staged artifact generation through final synthesis

## Manual verification

For a live run with real CLIs installed:

```bash
./bin/accord "Recent AI coding agents"
```

Check that:

- a new folder appears under `runs/`
- shared research is written once
- the coordinator and debaters match `--llms` or `.accordrc`
- each active debater writes understanding, opinion, and debate files
- the coordinator writes the final synthesis file
