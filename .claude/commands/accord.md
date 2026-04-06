---
name: accord
description: Run an Accord multi-agent debate from within Claude Code. Invoke as /accord "topic" or /accord --llms <spec> "topic". Requires at least one of codex, claude, or gemini on PATH (or a custom provider in .accordrc).
---

# Accord Debate Skill

Runs a local multi-agent debate via `./bin/accord` and reports where the output was saved.

## Usage

```
/accord "your topic here"
/accord --llms codex:coordinator,claude:debater,gemini:debater "your topic"
```

## How to invoke this skill

When the user invokes `/accord` or asks to run an Accord debate:

1. **Extract the topic.** Everything after `/accord` (excluding an optional `--llms` flag and its value) is the topic string.

2. **Check for a topic.** If no topic is present, respond:
   ```
   Usage: /accord "your topic"
   Example: /accord "Recent AI coding agents"
   ```
   Then stop.

3. **Extract the optional `--llms` spec** if present. Format: `provider:role,...`
   Example: `codex:coordinator,claude:debater,gemini:debater`

4. **Run the debate** from the repo root using Bash:

   Without `--llms`:
   ```bash
   ./bin/accord "<topic>"
   ```

   With `--llms`:
   ```bash
   ./bin/accord --llms "<llms-spec>" "<topic>"
   ```

   > Note: `./bin/accord` must be run from the repo root. Claude Code sets the working directory to the project root by default.

5. **Report back to the user:**
   - Confirm the debate finished
   - Show the full run directory path (e.g. `runs/2026-04-06T12-00-00Z-recent-ai/`)
   - Mention that `run_summary.md` inside that directory lists the coordinator, debaters, provider styles, and all generated artifacts

## Provider requirements

At least one of `codex`, `claude`, or `gemini` must be on PATH, or `.accordrc` must define a custom provider set via `ACCORD_PROVIDERS`. If a provider is unavailable, Accord logs it and continues with those that are installed.

## Prompt mode

Topics containing keywords like `analysis`, `roadmap`, `compare`, `audit`, `strategy`, `plan`, `review`, or `readiness` automatically use the more detailed structured prompt templates. Other topics use the compact bullet-first templates.
