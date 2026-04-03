# Provider Authoring

All provider implementations extend `AbstractProvider` from `src/providers/core/abstract-provider.ts`.
The base contract is intentionally small: each provider exposes an `id`, `displayName`, and `command`, then implements `buildPrompt`, `execute`, and `normalize`.

## Prompt construction

`buildPrompt(context)` should choose the right prompt for the current round.
The built-in providers use the same pattern: they send an independent research prompt when `peerOutputs` is empty, and a cross-review prompt when peer outputs are present.

Keep prompt construction separate from process execution.
That makes it easy to test the prompt content without running the external CLI.

## Execution

`execute(context)` is responsible for calling the local provider CLI with the workspace directory and the prompt text.
The current built-ins use `ProcessRunner` for that boundary.

## Normalization

`normalize(rawOutput)` should adapt provider output into the shared `ProviderExecutionResult` shape.
The current built-ins keep this minimal and return the raw output unchanged, while the debate orchestrator parses the claims JSON it needs for consensus.

When adding a new provider, prefer a small, predictable normalization step over embedding provider-specific parsing throughout the app.
