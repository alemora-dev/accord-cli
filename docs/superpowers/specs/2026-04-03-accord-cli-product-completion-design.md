# Accord CLI Product Completion Design

## Summary

Accord already has the core scaffold: provider adapters, orchestration, session persistence, a guided shell, export support, and project documentation. The next phase is to turn that scaffold into a real end-to-end debate product.

The product completion milestone should make `accord` capable of running a live multi-agent debate from the CLI, persisting complete debate artifacts, presenting a hybrid final answer, and supporting follow-up questions within the same saved session.

## Goal

Turn the current scaffold into a usable local-first debate CLI where:

- a user launches a debate from `accord`
- selected agents run independently and then critique peers
- Accord presents a short final answer plus a structured explanation of why that answer won
- the session is saved with enough context to support follow-up questions without starting from scratch

## Product Direction

### Output Shape

The final response should be a hybrid of chat and report:

- concise chat-style answer first
- structured explanation after it
- optional compact or detailed mode later

The default terminal output should be easy to scan:

1. Final answer
2. Why this answer won
3. Agreement summary
4. Disagreement summary
5. Agent-by-agent summaries
6. Open questions

The design should avoid forcing a rigid table metaphor. The user asked for a readable example-style comparison, not a database table.

### Follow-Up Model

Each debate is a live session with memory on disk.

Default behavior:

- follow-up questions read the stored session context first
- Accord should not re-run agents unless the user explicitly asks to refresh or challenge the result
- when a re-run is requested, Accord should re-run all previously selected agents by default

This keeps the product simple while preserving context and reducing unnecessary provider usage.

## What Is Missing In The Current Codebase

The scaffold is strong, but the following gaps remain:

### Live Debate Execution

The REPL currently stops at a launch gate. It does not yet call the real debate execution flow and present real results from `runDebate()`.

### Rich Provider Artifacts

The orchestrator currently collapses provider outputs down too early. That is enough for consensus scaffolding, but not enough for good user-facing inspection or strong follow-up context.

### Session Artifact Persistence

The session repository exists, but the live debate flow does not yet persist complete per-round artifacts and final synthesis data back into a structured session directory.

### Final Presentation Layer

The CLI has prompts and presenters, but it does not yet present a true hybrid final answer with reasoning sections.

### Follow-Up Conversations

There is no current path for asking additional questions against a completed debate session.

### Session Commands

Commands such as `sessions`, `resume`, and `export` exist only as partial product surfaces. They need to become complete user flows.

## Architecture Direction For This Phase

The existing architecture can stay intact. This phase should extend it rather than replace it.

### CLI Layer

Needs:

- a real launch path from REPL to use case execution
- post-run presentation
- follow-up prompt loop within a session
- session listing and export views

### Application Layer

Needs:

- a real use case for starting a live debate session
- a use case for asking follow-up questions against a saved session
- a use case for exporting stored results
- a use case for listing sessions

### Domain Layer

Needs:

- richer debate result objects
- clearer distinction between independent findings, review findings, and final synthesis
- a deterministic final answer synthesizer that explains why the result won

The final answer should remain deterministic by default rather than being delegated to an additional model-written judge step.

### Infrastructure Layer

Needs:

- session artifact writing for each round
- loading of stored debate context for follow-ups
- export of session artifacts to Markdown

## Deterministic Final Synthesis

The default final answer should be produced by Accord itself from structured debate outputs, not by asking another model to write the winner.

The deterministic synthesis should:

- select the final answer from reviewed findings and consensus result
- explain why it won using agreement and evidence signals
- expose disagreements clearly
- keep open questions visible

This makes the product easier to test, easier to audit, and cheaper to run.

An optional model-written synthesis can be added later as a mode, but it should not be the default.

## Session Memory Model

Each session should persist enough data that a follow-up question can build on prior debate state.

Stored artifacts should include:

- session metadata
- topic
- selected providers
- independent round raw outputs
- cross-review round raw outputs
- normalized findings
- final deterministic synthesis
- exported Markdown output
- follow-up history

The saved session should allow Accord to answer:

- what did each provider say?
- where did they agree?
- where did they disagree?
- what final answer was shown to the user?
- what follow-ups have already been asked?

## Proposed Next Implementation Slices

### Slice 1: Wire Live Debate Execution

Connect the guided REPL to the real debate runner and return a complete debate result object.

### Slice 2: Persist Full Debate Artifacts

Extend session persistence so full per-round artifacts and final synthesis are written to disk.

### Slice 3: Build Final Answer Presentation

Create the hybrid result presentation:

- short answer first
- explanation of why it won
- agreement and disagreement sections
- agent summaries
- open questions

### Slice 4: Add Follow-Up Session Chat

Let the user ask follow-up questions in the same session using stored context.

### Slice 5: Complete Session Commands

Implement:

- `accord sessions`
- `accord resume <sessionId>`
- `accord export <sessionId>`

as complete user-facing flows.

### Slice 6: Hardening

Add tests and failure handling for:

- malformed provider output
- provider failures
- partial session recovery
- export edge cases
- follow-up context behavior

## Non-Goals For This Phase

- full graphical TUI
- hosted backend
- plugin marketplace
- selective per-follow-up agent picker
- model-written final judge as the default

## Final Recommendation

The next phase should focus on product completion, not re-architecture. The core scaffold is already good enough. The fastest path to a usable product is:

1. wire live execution
2. persist full artifacts
3. present a real final answer
4. add follow-up memory
5. complete session commands

That delivers the behavior the user actually wants: a saved multi-agent debate session that converges on a final answer and can continue from there.
