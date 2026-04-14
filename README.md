# Accord — Multi-Agent Debates That Commit to Your Repo

[![version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/alemora-dev/accord-cli/releases)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![shell](https://img.shields.io/badge/runtime-none-brightgreen)](https://github.com/alemora-dev/accord-cli)

**Permanent architectural decisions, not ephemeral chat opinions.**

Accord runs a council of AI agents on any topic and writes the full debate — research, opinions, cross-examination, synthesis — as Markdown files you can commit to your repository. No Python. No runtime. One command.

---

## Why Accord

| | Accord | Ephemeral assistants |
|---|---|---|
| **Output** | Permanent `.md` files in `runs/` | Disappears when you close the chat |
| **Install** | `npm install -g @alemora/accord` | Python 3.10+ + uv + manual config |
| **Runtime** | Zero — single binary | Requires runtime |
| **LLMs** | Any CLI (codex, claude, gemini, custom) | Platform-specific |
| **Teams** | Built-in specialist presets | Generic assistant |
| **Open** | Edit prompts directly in `src/prompts/` | Black box |

---

## Install

```bash
# One-off — no install needed
npx @alemora/accord "Should we migrate to microservices?"

# Permanent global install
npm install -g @alemora/accord
accord "Should we migrate to microservices?"
```

## Quick Start

```bash
# Run a debate
accord "Should we migrate to a microservices architecture?"

# Use a specialist team
accord --team security "Review the new authentication flow"
accord --team architecture "Evaluate the trade-offs of using Bun vs Node.js"
```

---

## How It Works

```mermaid
graph TD
    A[Topic] --> B[Shared Research]
    B --> C{Parallel Deliberation}
    C --> D[Claude]
    C --> E[Gemini]
    C --> F[Codex]
    D & E & F --> G[Cross-Examination]
    G --> H[Final Synthesis]
    H --> I[runs/timestamp-slug/]
```

Five stages, all written to `runs/<timestamp>-<slug>/`:

1. **Shared Research** — coordinator does one web-research pass
2. **Understanding** — each debater extracts key facts
3. **Opinion** — each debater gives an initial answer
4. **Cross-Examination** — each debater reads peer opinions and revises
5. **Final Synthesis** — coordinator writes the definitive summary

---

## Specialist Teams

Built-in teams inject a shared specialist persona into every debater stage. No extra config.

### Security review
```bash
# Evaluate a new feature for vulnerabilities
accord --team security "Review the new OAuth2 login flow"

# Audit a third-party dependency before adopting it
accord --team security "Should we adopt Prisma for ORM?"

# Red-team a proposed API design
accord --team security "Is our API key rotation scheme safe?"
```

### Architecture
```bash
# Weigh a major structural change
accord --team architecture "Monorepo vs polyrepo for our three services"

# Evaluate a framework migration
accord --team architecture "Migrate from Express to Fastify"

# Design a new subsystem
accord --team architecture "How should we structure the plugin system?"
```

### Performance
```bash
# Profile a bottleneck before optimizing
accord --team performance "Why is the checkout page slow on mobile?"

# Choose between two implementations
accord --team performance "Redis pub/sub vs Kafka for our event pipeline"

# Review a query before it ships
accord --team performance "Evaluate the new dashboard aggregation query"
```

### Debug
```bash
# Trace an incident with multiple theories
accord --team debug "Why is the payment service timing out under load?"

# Investigate a flaky test
accord --team debug "Test suite fails 1-in-10 runs in CI"

# Root-cause a production regression
accord --team debug "Memory leak introduced in v3.2.1"
```

---

## Choosing LLMs

Override the default provider set with `--llms`:

```bash
# Three-way debate with explicit roles
accord --llms codex:coordinator,claude:debater,gemini:debater \
  "Best browser automation workflows"

# Two debaters, no Gemini
accord --llms claude:coordinator,codex:debater \
  "Should we add an event sourcing layer?"

# Combine a team preset with a custom LLM set
accord --team security \
  --llms claude:coordinator,gemini:debater,codex:debater \
  "Evaluate the new authentication middleware"
```

---

## Artifacts

Every run produces a self-contained folder you can commit alongside your code:

```
runs/
└── 2026-04-13T19-04-07Z-best-browser/
    ├── best-browser_research_1.md          ← shared research (coordinator)
    ├── best-browser_claude_understanding_1.md
    ├── best-browser_claude_opinion_1.md
    ├── best-browser_claude_debate_1.md
    ├── best-browser_gemini_understanding_1.md
    ├── best-browser_gemini_opinion_1.md
    ├── best-browser_gemini_debate_1.md
    ├── best-browser_final_1.md             ← authoritative synthesis
    └── run_summary.md                      ← metadata + quick verdict
```

See [`examples/best-browser-automation/`](examples/best-browser-automation/) for a real run output.

Commit `runs/` to your repository. Review it in pull requests. Reference it in your ADRs.

---

## Custom Providers

Wire any CLI that can read a prompt from stdin into `.accordrc`:

```bash
ACCORD_PROVIDERS=writer,critic
ACCORD_PROVIDER_WRITER_STYLE=codex
ACCORD_PROVIDER_WRITER_BIN=codex
ACCORD_PROVIDER_CRITIC_STYLE=gemini
ACCORD_PROVIDER_CRITIC_BIN=gemini
ACCORD_LLMS=writer:coordinator,critic:debater
```

---

## Development

```bash
# Run tests
bun test

# Build binaries
bun run scripts/build.ts

# Run from source
bun run src/main.ts "Topic"
```

Core docs: [`docs/architecture.md`](docs/architecture.md)

---

> *"Reliability comes from engineering discipline, not better prompts."*
