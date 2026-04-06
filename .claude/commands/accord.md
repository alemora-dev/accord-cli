---
name: accord
description: Run an Accord multi-agent debate from within Claude Code. Invoke as /accord "topic" or /accord --llms <spec> "topic". Requires at least one of codex, claude, or gemini on PATH for debater roles.
---

# Accord Debate Skill

Runs a local multi-agent debate where **YOU** (the current agent) act as the **Coordinator**, and external LLMs (via `./bin/accord`) act as the **Debaters**.

## Usage

```
/accord "your topic here"
/accord --llms codex:debater,gemini:debater "your topic"
```

## How to invoke this skill

When the user invokes `/accord` or asks to run an Accord debate:

1. **Extract the topic.** Everything after `/accord` (excluding an optional `--llms` flag and its value) is the topic string.

2. **Check for a topic.** If no topic is present, respond with usage instructions and stop.

3. **Provider Availability Pre-check.** 
   Run `which codex`, `which claude`, and `which gemini` to verify available debater providers. Report missing ones.

4. **Debater Selection.**
   If the user omitted the `--llms` flag, **ASK** which providers they want for **Debater 1** and **Debater 2**.
   If they provided a spec, extract only the `debater` roles.

5. **ACT AS COORDINATOR - Stage 1: Shared Research.**
   - Determine the slug for the topic (lowercase, alphanumeric and hyphens only).
   - Read `accord/prompts/shared-research.md` (or `shared-research.detailed.md` if the topic is complex).
   - Generate the research content yourself based on the topic.
   - Create a run directory: `runs/$(date +%Y-%m-%dT%H-%M-%SZ)-<slug>/`.
   - Write your research to `<run-dir>/<slug>_research_1.md`.

6. **BLOCKING STEP — Run Debaters.**
   Run the `accord` binary using the `--run-dir`, `--slug`, `--skip-research`, and `--skip-synthesis` flags to delegate ONLY the debater roles.
   
   ```bash
   ./bin/accord --run-dir "<run-dir>" --slug "<slug>" --skip-research --skip-synthesis --llms "<debater-only-spec>" "<topic>"
   ```
   *Note: Since research and synthesis are skipped, you do NOT need to provide a coordinator in the --llms spec.*

7. **ACT AS COORDINATOR - Stage 5: Final Synthesis.**
   - Once the binary finishes, verify the debater artifacts exist in the run directory.
   - Read the debater outputs (`*_debate_1.md`) and your original research.
   - Read `accord/prompts/final-synthesis.md` (or `detailed` version).
   - Generate the final synthesis yourself and write it to `<run-dir>/<slug>_final_1.md`.

8. **Final Response.**
   - Confirm the debate finished.
   - Show the run directory path and list generated files.
   - **Echo the FULL CONTENTS of your Final Synthesis** to the user.

## Provider requirements

At least one of `codex`, `claude`, or `gemini` must be on PATH for debaters.

## Prompt mode

Topics containing keywords like `analysis`, `roadmap`, `compare`, `audit`, `strategy`, `plan`, `review`, or `readiness` use the `*.detailed.md` templates.
