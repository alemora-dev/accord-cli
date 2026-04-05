# Open Source Roadmap

Accord should stay a small bash tool with file-based state, readable prompts, and plain Markdown artifacts. The value is transparency, not orchestration magic.

## Now

- Replace hardcoded providers with a tiny config-driven provider contract in `.accordrc`.
- Keep the current pipeline shape: one coordinator, ordered debaters, one shared research pass, one final synthesis.
- Do not build a plugin framework. A provider should just be a named command adapter plus a few config fields.

## Next

- Add a small run summary artifact with token and cost estimates when the provider can report them.
- Add one simple debate depth control like `--rounds 2`, capped and explicit.

## Later

- Add local model adapters such as `ollama` and `llama.cpp`, but only through the same provider contract as hosted tools.
- Add an optional `--interactive` mode with pauses after research, after opinions, and before final synthesis.

## Not Now

- No plugin marketplace.
- No hook system.
- No protocol DSL.
- No interactive REPL.

## Design Rule

If a feature adds a new abstraction layer, hidden state, or special-case orchestration path, it is probably the wrong feature.
