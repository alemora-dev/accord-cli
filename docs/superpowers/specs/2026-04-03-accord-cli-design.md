# Accord CLI Design

## Summary

Accord is a local-first, open-source TypeScript CLI for running structured multi-agent research debates across multiple external coding and research agents such as Codex CLI, Claude Code, and Gemini CLI. It is designed around independent research first, structured cross-review second, and deterministic consensus last.

The product is not a loose wrapper around subprocesses. It is a persistent, resumable interactive CLI with a clear domain model, saved sessions, provider abstractions, and a testing strategy that avoids burning provider credits during normal development.

## Goals

- Build a polished interactive CLI for topic-based research and debate.
- Support multiple providers through stable abstract classes and concrete adapters.
- Preserve agent independence during the first pass, then bring them together through a structured protocol.
- Save sessions by default so debates can be resumed, inspected, and exported later.
- Keep the architecture generic enough to add future providers such as `grok`.
- Make the core system highly testable without requiring live provider execution.

## Non-Goals For V1

- Code-review mode against a local repository.
- Hosted infrastructure or cloud-managed execution.
- A full-screen terminal UI as the primary interaction model.
- Autonomous free-form agent conversation without explicit orchestration rounds.
- LLM-judge consensus as the default mechanism.

## Product Direction

### Primary Experience

The primary UX is an interactive guided REPL, inspired by the product feel of Claude Code rather than a report generator or a one-off script. The CLI should feel deliberate, stateful, and conversational, but still remain scriptable.

The default entrypoint is `accord`, which opens a persistent interactive session. The CLI should also support direct commands for automation and advanced usage, but those commands are secondary to the guided experience.

### Core Commands

The initial command surface should be small and opinionated:

- `accord`
- `accord setup`
- `accord sessions`
- `accord resume <session-id>`
- `accord export <session-id>`

The interactive session should support slash-style commands for common actions such as viewing provider outputs, inspecting consensus, exporting artifacts, and rerunning with different settings.

### Session Behavior

Sessions are saved by default. A debate is treated as a persistent local object with raw transcripts, normalized artifacts, round metadata, and final outputs stored on disk. Resuming a session should restore context without rerunning providers unless the user explicitly asks for another execution.

## Debate Protocol

### Default Protocol

V1 uses one strong default protocol with advanced overrides later:

1. Independent research round
2. Cross-review round
3. Deterministic consensus

This default flow is intentionally opinionated. The guided UX should not force users to think about debate protocol unless they are using advanced configuration.

### Independent Research

Each selected provider receives the same topic, shared output schema expectations, and identical constraints, but researches independently using its own capabilities. Accord does not prepare a shared evidence pack in V1 because that would reduce independence and make convergence less informative.

Each provider response should produce, at minimum:

- answer or position
- claims
- assumptions
- evidence
- citations
- confidence
- unresolved doubts
- clearly labeled inference or speculation

### Cross-Review

After the independent round, each provider receives the normalized outputs of the other selected providers. The cross-review prompt asks for:

- points of agreement
- disputed claims
- weak or unsupported arguments
- missing evidence
- a revised final position

Providers do not rewrite each other directly. They critique peers through structured output.

### Consensus

The default consensus engine is deterministic, not model-judged. It should:

- promote claims supported by at least two providers
- separate agreement from evidence quality
- preserve contested claims as explicit disagreements
- downgrade unsupported claims rather than silently dropping them
- keep speculative conclusions clearly labeled

An optional LLM judge may be added later, but it should be an explicit override rather than the default behavior.

## Evidence Policy

Accord is evidence-first, not evidence-only.

- Factual claims should include evidence or citations whenever the provider can supply them.
- Interpretive or strategic reasoning is allowed, but must be labeled as `inference` or `speculation`.
- Consensus logic should weigh evidence-backed claims above unsupported agreement.
- Unsupported claims remain visible in the final artifacts so the user can inspect failure modes.

## Cost And Launch Control

Because provider usage may consume credits, Accord should require a lightweight approval step before execution. That step should be fast, readable, and reasonably accurate rather than pretending to be perfectly precise.

The launch gate should show:

- selected providers
- enabled rounds
- whether live web or tool use is expected
- rough prompt size or artifact size
- estimated usage risk level

The user confirms once before the orchestration starts.

## Technology Choice

### Why TypeScript

TypeScript is the right primary language for this project.

Reasons:

- better fit for a polished interactive CLI
- strong typing for provider contracts and normalized schemas
- good ecosystem for prompts, terminal UX, config validation, and testing
- better long-term ergonomics for an extensible CLI product than a one-file Python orchestrator

Python would be simpler for a minimal subprocess prototype, but the project goal is now a proper product with interactive flows, OOP boundaries, and long-term extensibility.

## Architecture

The architecture should separate interactive UX, orchestration logic, domain modeling, provider integration, and persistence. The core orchestration should be testable without a terminal and without calling real providers.

### Layers

#### CLI Layer

Responsible for:

- interactive guided REPL
- `setup` flow
- session listing and resume commands
- lightweight status presentation
- approval gate presentation

This layer should know how to talk to the user, not how debates work internally.

#### Application Layer

Responsible for use cases such as:

- configure providers
- start debate
- resume session
- export results
- inspect provider outputs

This layer coordinates domain services and infrastructure.

#### Domain Layer

Responsible for core models and rules:

- `Session`
- `DebateRun`
- `DebateRound`
- `ProviderSelection`
- `ProviderResult`
- `NormalizedFinding`
- `Claim`
- `EvidenceItem`
- `ConsensusResult`

This layer contains protocol rules and deterministic consensus behavior.

#### Providers Layer

Responsible for:

- provider abstractions
- built-in provider adapters
- CLI capability detection
- command construction
- provider-specific normalization logic

Each provider adapter owns only what is specific to that provider.

#### Infrastructure Layer

Responsible for:

- subprocess execution
- filesystem persistence
- config loading
- environment inspection
- logging
- report serialization

This layer should be replaceable and isolated from domain decisions.

## Object-Oriented Provider Model

The provider system should be designed around abstract classes and explicit interfaces rather than config-only command templates.

### Base Abstractions

Recommended shape:

- `AbstractProvider`
- `ResearchProvider`
- `ProviderDetector`
- `ProviderCommandBuilder`
- `ProviderOutputNormalizer`

`AbstractProvider` should define stable responsibilities:

- identity and metadata
- capability discovery
- installation detection
- configuration validation
- round execution contract
- normalization hook

Concrete providers such as `CodexProvider`, `ClaudeProvider`, and `GeminiProvider` should extend the shared base and implement provider-specific behavior behind the same orchestration contract.

### Why This Matters

This structure makes future providers additive rather than invasive. Adding `grok` should mean implementing one new adapter plus any provider-specific prompt or normalization strategy, not rewriting orchestration logic.

## Recommended Project Structure

The repo should be organized as a real CLI project rather than a single oversized entry file.

```text
src/
  cli/
    repl/
    commands/
    prompts/
    presenters/
  application/
    use-cases/
    dto/
    services/
  domain/
    models/
    value-objects/
    services/
    policies/
  providers/
    core/
    builtins/
    prompts/
  infrastructure/
    config/
    fs/
    process/
    logging/
    export/
  testing/
    fixtures/
    fakes/
tests/
  unit/
  contract/
  integration/
docs/
  architecture.md
  provider-authoring.md
  session-model.md
  testing.md
```

The exact layout may evolve, but the boundary between domain rules, provider adapters, and terminal UX should remain explicit.

## Interactive UX Design

### Default Interaction Style

The CLI should favor a guided REPL over a full-screen TUI in V1.

Reasons:

- easier to build well
- simpler to test
- easier to combine with scriptable commands
- better fit for setup flows, provider selection, and approval gates

The UX should still feel polished:

- short, readable prompts
- clear progress indicators
- concise summaries after each major step
- discoverable slash commands
- consistent session resume behavior

### Setup Flow

`accord setup` should be the primary onboarding path.

It should:

- detect known providers on `PATH`
- validate required environment variables or local configuration
- show which providers are detected, configured, or unavailable
- ask for default provider selections
- write local config files

Secrets should still live in environment variables when applicable. Config files should store local preferences, command paths, and defaults rather than raw secrets.

### Debate Creation Flow

The interactive debate flow should:

1. Ask for the topic
2. Show detected and configured providers
3. Ask which providers to include
4. Show protocol summary and cost/risk estimate
5. Ask for one confirmation
6. Execute rounds
7. Present resumable results

## Persistence Model

Each session should have a stable local identifier and a dedicated on-disk directory.

The directory should store:

- session metadata
- user prompts and interaction events
- per-round raw provider outputs
- normalized JSON artifacts
- consensus outputs
- exportable summaries

The persistence model should be designed so a previous run can be inspected or exported without re-executing providers.

## Error Handling

Error behavior should be explicit and inspectable.

### Provider Availability Errors

If a provider is missing or misconfigured, Accord should surface that before launch whenever possible.

### Provider Execution Errors

If one provider fails mid-run:

- preserve partial artifacts
- mark the provider as failed
- continue the protocol when safe
- explain how the failure affected consensus quality

### Normalization Errors

If a provider returns malformed or incomplete output:

- preserve the raw artifact
- record the normalization error
- avoid silently coercing invalid data
- show the problem in session inspection views

### Interrupted Runs

If the process is interrupted or times out, the current round state should be checkpointed so the session can be resumed or inspected later.

## Testing Strategy

Testing is mandatory, but normal test execution must avoid spending provider credits.

### Unit Tests

Cover:

- domain models
- consensus rules
- config parsing
- launch gate estimation
- session persistence behavior
- provider detection logic

### Contract Tests

Each built-in provider adapter should have contract tests using canned fixtures. These tests verify command generation, expected output parsing, and normalization behavior without calling the live provider.

### Integration Tests

Integration tests should use fake providers to simulate:

- successful debate flow
- disagreement between providers
- missing citations
- malformed provider output
- provider timeout
- partial run recovery

### Live Provider Tests

Any real smoke tests that call external providers must be explicit and opt-in. They should not run in default local test commands or CI by default.

## Documentation Plan

The documentation should feel production-grade from the start.

### Required Docs

- `README.md`
- `docs/architecture.md`
- `docs/provider-authoring.md`
- `docs/session-model.md`
- `docs/testing.md`

### Documentation Standards

Docs should:

- explain the product clearly
- justify the provider abstraction model
- document how saved sessions work
- show how to add a new provider
- explain why tests avoid live provider usage by default

The documentation should read like a credible open-source CLI project, not like generated filler.

## Initial Implementation Priorities

The first implementation cycle should focus on the minimum architecture that proves the product shape cleanly:

1. Bootstrap TypeScript CLI project structure
2. Implement session persistence and config loading
3. Implement provider abstraction base classes
4. Add built-in adapters for Codex, Claude, and Gemini
5. Implement guided REPL flow
6. Implement debate orchestration for the default protocol
7. Implement deterministic consensus
8. Add test fixtures and non-live test coverage
9. Write polished documentation

## Open Questions Deferred Beyond V1

These are intentionally out of scope for the initial build, but the design should not block them:

- optional LLM judge pass
- richer terminal dashboards
- code-review mode
- plugin discovery beyond built-in providers
- remote execution or hosted coordination

## Final Recommendation

Build Accord as a TypeScript guided REPL with strong domain modeling, abstract provider classes, deterministic consensus, saved sessions by default, and a documentation and testing standard that treats the project as a real open-source CLI from the first commit.
