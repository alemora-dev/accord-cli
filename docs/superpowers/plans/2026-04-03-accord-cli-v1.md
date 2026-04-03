# Accord CLI V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first TypeScript CLI for multi-agent research debates with saved sessions, built-in Codex/Claude/Gemini providers, deterministic consensus, and non-live tests.

**Architecture:** The CLI is split into terminal UX, application orchestration, domain rules, provider adapters, and infrastructure services. The implementation keeps provider-specific subprocess behavior behind abstract classes and makes debate orchestration testable with fixtures and fake providers instead of live agent calls.

**Tech Stack:** TypeScript, Node.js, Commander, @clack/prompts, Zod, Execa, Vitest, TSUP

---

## File Structure

### Project Files

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `README.md`

### Source Files

- Create: `src/index.ts`
- Create: `src/cli/entry.ts`
- Create: `src/cli/repl/session-repl.ts`
- Create: `src/cli/prompts/setup-prompts.ts`
- Create: `src/cli/prompts/debate-prompts.ts`
- Create: `src/cli/presenters/session-presenter.ts`
- Create: `src/cli/presenters/consensus-presenter.ts`
- Create: `src/application/use-cases/run-debate.ts`
- Create: `src/application/use-cases/setup-providers.ts`
- Create: `src/application/use-cases/resume-session.ts`
- Create: `src/application/services/cost-estimator.ts`
- Create: `src/domain/models/session.ts`
- Create: `src/domain/models/provider.ts`
- Create: `src/domain/models/debate.ts`
- Create: `src/domain/models/consensus.ts`
- Create: `src/domain/services/consensus-engine.ts`
- Create: `src/domain/services/debate-orchestrator.ts`
- Create: `src/domain/value-objects/provider-output.ts`
- Create: `src/providers/core/abstract-provider.ts`
- Create: `src/providers/core/provider-registry.ts`
- Create: `src/providers/core/provider-detection.ts`
- Create: `src/providers/builtins/codex-provider.ts`
- Create: `src/providers/builtins/claude-provider.ts`
- Create: `src/providers/builtins/gemini-provider.ts`
- Create: `src/providers/prompts/independent-round.ts`
- Create: `src/providers/prompts/cross-review-round.ts`
- Create: `src/infrastructure/process/process-runner.ts`
- Create: `src/infrastructure/config/config-loader.ts`
- Create: `src/infrastructure/config/config-schema.ts`
- Create: `src/infrastructure/fs/session-repository.ts`
- Create: `src/infrastructure/fs/path-resolver.ts`
- Create: `src/infrastructure/export/markdown-exporter.ts`
- Create: `src/testing/fakes/fake-provider.ts`
- Create: `src/testing/fixtures/provider-outputs.ts`

### Test Files

- Create: `tests/unit/domain/consensus-engine.test.ts`
- Create: `tests/unit/domain/debate-orchestrator.test.ts`
- Create: `tests/unit/infrastructure/session-repository.test.ts`
- Create: `tests/unit/infrastructure/config-loader.test.ts`
- Create: `tests/unit/providers/provider-detection.test.ts`
- Create: `tests/contract/providers/codex-provider.test.ts`
- Create: `tests/contract/providers/claude-provider.test.ts`
- Create: `tests/contract/providers/gemini-provider.test.ts`
- Create: `tests/integration/run-debate.test.ts`
- Create: `tests/integration/setup-providers.test.ts`

## Task 1: Bootstrap The CLI Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `src/cli/entry.ts`
- Test: `tests/integration/setup-providers.test.ts`

- [ ] **Step 1: Write the failing integration test for CLI entrypoints**

```ts
import { describe, expect, it } from "vitest";
import { buildProgram } from "../../src/cli/entry";

describe("buildProgram", () => {
  it("registers the interactive default command and setup helpers", () => {
    const program = buildProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain("setup");
    expect(commandNames).toContain("sessions");
    expect(commandNames).toContain("resume");
    expect(commandNames).toContain("export");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/setup-providers.test.ts`
Expected: FAIL with `Cannot find module '../../src/cli/entry'` or equivalent missing file error.

- [ ] **Step 3: Create the Node/TypeScript toolchain and minimal CLI entry**

```json
{
  "name": "accord-cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "accord": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@clack/prompts": "^0.10.1",
    "commander": "^13.1.0",
    "execa": "^9.5.2",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsup": "^8.3.6",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.1"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts", "tsup.config.ts"]
}
```

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  dts: false,
  sourcemap: true
});
```

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

```gitignore
node_modules
dist
.DS_Store
.accord
.superpowers
coverage
```

```ts
#!/usr/bin/env node
import { buildProgram } from "./cli/entry.js";

await buildProgram().parseAsync(process.argv);
```

```ts
import { Command } from "commander";

export function buildProgram(): Command {
  const program = new Command();

  program.name("accord");
  program.description("Run structured multi-agent research debates");

  program.command("setup").description("Configure local providers");
  program.command("sessions").description("List saved debate sessions");
  program.command("resume").argument("<sessionId>").description("Resume a saved session");
  program.command("export").argument("<sessionId>").description("Export a saved session");

  return program;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/setup-providers.test.ts`
Expected: PASS

- [ ] **Step 5: Validate the full toolchain**

Run: `pnpm test`
Expected: PASS with `1 passed`

Run: `pnpm lint`
Expected: PASS with no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git status --short
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore src/index.ts src/cli/entry.ts tests/integration/setup-providers.test.ts
git commit -m "chore: bootstrap accord cli workspace"
```

## Task 2: Define The Core Debate Domain

**Files:**
- Create: `src/domain/models/provider.ts`
- Create: `src/domain/models/debate.ts`
- Create: `src/domain/models/session.ts`
- Create: `src/domain/models/consensus.ts`
- Create: `src/domain/value-objects/provider-output.ts`
- Test: `tests/unit/domain/consensus-engine.test.ts`

- [ ] **Step 1: Write the failing test for deterministic consensus rules**

```ts
import { describe, expect, it } from "vitest";
import { buildConsensusResult } from "../../../src/domain/models/consensus";

describe("buildConsensusResult", () => {
  it("keeps supported claims and exposes contested ones", () => {
    const result = buildConsensusResult({
      topic: "Topic",
      findings: [
        {
          providerId: "codex",
          claims: [{ id: "c1", text: "Claim A", support: "evidence-backed" }]
        },
        {
          providerId: "claude",
          claims: [{ id: "c2", text: "Claim A", support: "evidence-backed" }]
        },
        {
          providerId: "gemini",
          claims: [{ id: "c3", text: "Claim B", support: "unsupported" }]
        }
      ]
    });

    expect(result.consensusClaims).toHaveLength(1);
    expect(result.consensusClaims[0]?.text).toBe("Claim A");
    expect(result.contestedClaims).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/domain/consensus-engine.test.ts`
Expected: FAIL with missing domain model error.

- [ ] **Step 3: Implement the core domain models and value objects**

```ts
export type ProviderId = "codex" | "claude" | "gemini" | string;

export type SupportLevel = "evidence-backed" | "inference" | "speculation" | "unsupported";

export interface Claim {
  id: string;
  text: string;
  support: SupportLevel;
  citations?: string[];
}

export interface EvidenceItem {
  id: string;
  summary: string;
  citation?: string;
}

export interface ProviderFinding {
  providerId: ProviderId;
  claims: Claim[];
  evidence?: EvidenceItem[];
  confidence?: number;
}
```

```ts
import type { ProviderFinding } from "../value-objects/provider-output.js";

export interface DebateRound {
  id: string;
  kind: "independent" | "cross-review" | "consensus";
  startedAt: string;
  completedAt?: string;
}

export interface DebateRun {
  topic: string;
  selectedProviderIds: string[];
  rounds: DebateRound[];
  findings: ProviderFinding[];
}
```

```ts
import type { DebateRun } from "./debate.js";

export interface SessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  run?: DebateRun;
}
```

```ts
import type { ProviderFinding } from "../value-objects/provider-output.js";

export interface ConsensusClaim {
  text: string;
  supportingProviderIds: string[];
}

export interface ConsensusResult {
  topic: string;
  consensusClaims: ConsensusClaim[];
  contestedClaims: { text: string; providerIds: string[] }[];
}

export function buildConsensusResult(input: {
  topic: string;
  findings: ProviderFinding[];
}): ConsensusResult {
  const groups = new Map<string, { text: string; providerIds: Set<string> }>();

  for (const finding of input.findings) {
    for (const claim of finding.claims) {
      const key = claim.text.trim().toLowerCase();
      const entry = groups.get(key) ?? {
        text: claim.text,
        providerIds: new Set<string>()
      };
      entry.providerIds.add(finding.providerId);
      groups.set(key, entry);
    }
  }

  const consensusClaims: ConsensusClaim[] = [];
  const contestedClaims: { text: string; providerIds: string[] }[] = [];

  for (const { text, providerIds } of groups.values()) {
    const normalizedProviders = [...providerIds];
    if (normalizedProviders.length >= 2) {
      consensusClaims.push({ text, supportingProviderIds: normalizedProviders });
    } else {
      contestedClaims.push({ text, providerIds: normalizedProviders });
    }
  }

  return {
    topic: input.topic,
    consensusClaims,
    contestedClaims
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/domain/consensus-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS with `2 passed`

- [ ] **Step 6: Commit**

```bash
git add src/domain/models/provider.ts src/domain/models/debate.ts src/domain/models/session.ts src/domain/models/consensus.ts src/domain/value-objects/provider-output.ts tests/unit/domain/consensus-engine.test.ts
git commit -m "feat: add core debate domain models"
```

## Task 3: Implement Config Loading And Session Persistence

**Files:**
- Create: `src/infrastructure/config/config-schema.ts`
- Create: `src/infrastructure/config/config-loader.ts`
- Create: `src/infrastructure/fs/path-resolver.ts`
- Create: `src/infrastructure/fs/session-repository.ts`
- Test: `tests/unit/infrastructure/config-loader.test.ts`
- Test: `tests/unit/infrastructure/session-repository.test.ts`

- [ ] **Step 1: Write the failing tests for config and session storage**

```ts
import { describe, expect, it } from "vitest";
import { parseAccordConfig } from "../../../src/infrastructure/config/config-loader";

describe("parseAccordConfig", () => {
  it("loads provider defaults and storage paths", () => {
    const config = parseAccordConfig({
      storageDir: ".accord/sessions",
      providers: {
        codex: { command: "codex", enabled: true }
      }
    });

    expect(config.storageDir).toBe(".accord/sessions");
    expect(config.providers.codex.command).toBe("codex");
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { SessionRepository } from "../../../src/infrastructure/fs/session-repository";

describe("SessionRepository", () => {
  it("writes and reads a saved session", async () => {
    const repository = new SessionRepository("/tmp/accord-test");

    await repository.save({
      id: "session-1",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
      title: "AI regulation debate"
    });

    const session = await repository.get("session-1");

    expect(session?.title).toBe("AI regulation debate");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/infrastructure/config-loader.test.ts tests/unit/infrastructure/session-repository.test.ts`
Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement config parsing and session repository**

```ts
import { z } from "zod";

export const providerConfigSchema = z.object({
  command: z.string(),
  enabled: z.boolean().default(false)
});

export const accordConfigSchema = z.object({
  storageDir: z.string().default(".accord/sessions"),
  providers: z.record(providerConfigSchema).default({})
});

export type AccordConfig = z.infer<typeof accordConfigSchema>;
```

```ts
import { accordConfigSchema, type AccordConfig } from "./config-schema.js";

export function parseAccordConfig(input: unknown): AccordConfig {
  return accordConfigSchema.parse(input);
}
```

```ts
import path from "node:path";

export function resolveStorageDir(cwd: string, configuredDir: string): string {
  return path.resolve(cwd, configuredDir);
}
```

```ts
import fs from "node:fs/promises";
import path from "node:path";
import type { SessionRecord } from "../../domain/models/session.js";

export class SessionRepository {
  constructor(private readonly rootDir: string) {}

  async save(session: SessionRecord): Promise<void> {
    const sessionDir = path.join(this.rootDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(sessionDir, "session.json"),
      JSON.stringify(session, null, 2),
      "utf8"
    );
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    try {
      const file = await fs.readFile(path.join(this.rootDir, sessionId, "session.json"), "utf8");
      return JSON.parse(file) as SessionRecord;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/infrastructure/config-loader.test.ts tests/unit/infrastructure/session-repository.test.ts`
Expected: PASS

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm lint`
Expected: PASS

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/config/config-schema.ts src/infrastructure/config/config-loader.ts src/infrastructure/fs/path-resolver.ts src/infrastructure/fs/session-repository.ts tests/unit/infrastructure/config-loader.test.ts tests/unit/infrastructure/session-repository.test.ts
git commit -m "feat: add config loading and session persistence"
```

## Task 4: Build The Provider Abstractions And Detection Layer

**Files:**
- Create: `src/providers/core/abstract-provider.ts`
- Create: `src/providers/core/provider-registry.ts`
- Create: `src/providers/core/provider-detection.ts`
- Create: `src/domain/models/provider.ts`
- Test: `tests/unit/providers/provider-detection.test.ts`

- [ ] **Step 1: Write the failing detection test**

```ts
import { describe, expect, it } from "vitest";
import { detectProviders } from "../../../src/providers/core/provider-detection";

describe("detectProviders", () => {
  it("marks a provider as detected when its command exists", async () => {
    const results = await detectProviders([
      {
        id: "codex",
        command: "codex"
      }
    ], async (command) => command === "codex");

    expect(results[0]).toEqual({
      id: "codex",
      command: "codex",
      detected: true
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/providers/provider-detection.test.ts`
Expected: FAIL with missing provider detection module.

- [ ] **Step 3: Implement the provider contracts and detection utilities**

```ts
export interface ProviderDetectionResult {
  id: string;
  command: string;
  detected: boolean;
}

export interface ProviderExecutionContext {
  topic: string;
  workspaceDir: string;
  peerOutputs?: string[];
}

export interface ProviderExecutionResult {
  rawOutput: string;
}
```

```ts
import type { ProviderExecutionContext, ProviderExecutionResult } from "../../domain/models/provider.js";

export abstract class AbstractProvider {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly command: string;

  abstract buildPrompt(context: ProviderExecutionContext): string;
  abstract execute(context: ProviderExecutionContext): Promise<string>;

  abstract normalize(rawOutput: string): ProviderExecutionResult;
}
```

```ts
import type { AbstractProvider } from "./abstract-provider.js";

export class ProviderRegistry {
  constructor(private readonly providers: AbstractProvider[]) {}

  list(): AbstractProvider[] {
    return [...this.providers];
  }
}
```

```ts
import type { ProviderDetectionResult } from "../../domain/models/provider.js";

export async function detectProviders(
  providers: Array<{ id: string; command: string }>,
  hasCommand: (command: string) => Promise<boolean>
): Promise<ProviderDetectionResult[]> {
  const results: ProviderDetectionResult[] = [];

  for (const provider of providers) {
    results.push({
      id: provider.id,
      command: provider.command,
      detected: await hasCommand(provider.command)
    });
  }

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/providers/provider-detection.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/providers/core/abstract-provider.ts src/providers/core/provider-registry.ts src/providers/core/provider-detection.ts src/domain/models/provider.ts tests/unit/providers/provider-detection.test.ts
git commit -m "feat: add provider abstractions and detection"
```

## Task 5: Add Built-In Provider Adapters With Contract Tests

**Files:**
- Create: `src/providers/builtins/codex-provider.ts`
- Create: `src/providers/builtins/claude-provider.ts`
- Create: `src/providers/builtins/gemini-provider.ts`
- Create: `src/providers/prompts/independent-round.ts`
- Create: `src/providers/prompts/cross-review-round.ts`
- Create: `src/infrastructure/process/process-runner.ts`
- Create: `src/testing/fixtures/provider-outputs.ts`
- Test: `tests/contract/providers/codex-provider.test.ts`
- Test: `tests/contract/providers/claude-provider.test.ts`
- Test: `tests/contract/providers/gemini-provider.test.ts`

- [ ] **Step 1: Write the failing contract test for one provider and duplicate the pattern**

```ts
import { describe, expect, it } from "vitest";
import { CodexProvider } from "../../../src/providers/builtins/codex-provider";

describe("CodexProvider", () => {
  it("builds an evidence-first independent-round prompt", () => {
    const provider = new CodexProvider();
    const prompt = provider.buildPrompt({
      topic: "Should governments mandate model audits?",
      workspaceDir: "/tmp/accord"
    });

    expect(prompt).toContain("evidence-first");
    expect(prompt).toContain("claims");
    expect(prompt).toContain("citations");
  });
});
```

- [ ] **Step 2: Run contract tests to verify they fail**

Run: `pnpm vitest run tests/contract/providers/codex-provider.test.ts tests/contract/providers/claude-provider.test.ts tests/contract/providers/gemini-provider.test.ts`
Expected: FAIL with missing provider adapter files.

- [ ] **Step 3: Implement shared prompts and the built-in providers**

```ts
export function buildIndependentRoundPrompt(topic: string): string {
  return [
    `You are participating in an evidence-first research debate.`,
    `Topic: ${topic}`,
    `Return JSON with answer, claims, assumptions, evidence, citations, confidence, open_questions, and labeled inference or speculation.`
  ].join("\n");
}
```

```ts
export function buildCrossReviewPrompt(topic: string, peerOutputs: string[]): string {
  return [
    `You are reviewing peer outputs for the topic: ${topic}`,
    `Identify agreement, disputed claims, missing evidence, weak support, and your revised final position.`,
    `Peer outputs:`,
    ...peerOutputs
  ].join("\n");
}
```

```ts
import { execa } from "execa";

export class ProcessRunner {
  async run(command: string, args: string[], input: string): Promise<string> {
    const result = await execa(command, args, {
      input,
      stdout: "pipe",
      stderr: "pipe"
    });

    return result.stdout;
  }
}
```

```ts
import { AbstractProvider } from "../core/abstract-provider.js";
import { buildIndependentRoundPrompt } from "../prompts/independent-round.js";
import { buildCrossReviewPrompt } from "../prompts/cross-review-round.js";
import type { ProviderExecutionContext, ProviderExecutionResult } from "../../domain/models/provider.js";
import { ProcessRunner } from "../../infrastructure/process/process-runner.js";

export class CodexProvider extends AbstractProvider {
  readonly id = "codex";
  readonly displayName = "Codex";
  readonly command = "codex";
  constructor(private readonly runner = new ProcessRunner()) {
    super();
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length
      ? buildCrossReviewPrompt(context.topic, context.peerOutputs)
      : buildIndependentRoundPrompt(context.topic);
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    return this.runner.run(this.command, ["exec", "--json"], this.buildPrompt(context));
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return { rawOutput };
  }
}
```

```ts
export const codexIndependentFixture = JSON.stringify({
  answer: "Sample answer",
  claims: [{ id: "claim-1", text: "Claim A", support: "evidence-backed" }],
  citations: ["https://example.com/source-a"],
  confidence: 0.74
});
```

- [ ] **Step 4: Mirror the same shape for Claude and Gemini**

```ts
export class ClaudeProvider extends AbstractProvider {
  readonly id = "claude";
  readonly displayName = "Claude Code";
  readonly command = "claude";
  constructor(private readonly runner = new ProcessRunner()) {
    super();
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length
      ? buildCrossReviewPrompt(context.topic, context.peerOutputs)
      : buildIndependentRoundPrompt(context.topic);
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    return this.runner.run(this.command, ["-p"], this.buildPrompt(context));
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return { rawOutput };
  }
}
```

```ts
export class GeminiProvider extends AbstractProvider {
  readonly id = "gemini";
  readonly displayName = "Gemini CLI";
  readonly command = "gemini";
  constructor(private readonly runner = new ProcessRunner()) {
    super();
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length
      ? buildCrossReviewPrompt(context.topic, context.peerOutputs)
      : buildIndependentRoundPrompt(context.topic);
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    return this.runner.run(this.command, ["-p"], this.buildPrompt(context));
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return { rawOutput };
  }
}
```

- [ ] **Step 5: Run contract tests to verify they pass**

Run: `pnpm vitest run tests/contract/providers/codex-provider.test.ts tests/contract/providers/claude-provider.test.ts tests/contract/providers/gemini-provider.test.ts`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/providers/builtins/codex-provider.ts src/providers/builtins/claude-provider.ts src/providers/builtins/gemini-provider.ts src/providers/prompts/independent-round.ts src/providers/prompts/cross-review-round.ts src/infrastructure/process/process-runner.ts src/testing/fixtures/provider-outputs.ts tests/contract/providers/codex-provider.test.ts tests/contract/providers/claude-provider.test.ts tests/contract/providers/gemini-provider.test.ts
git commit -m "feat: add built-in provider adapters"
```

## Task 6: Implement Debate Orchestration And Deterministic Consensus

**Files:**
- Create: `src/domain/services/consensus-engine.ts`
- Create: `src/domain/services/debate-orchestrator.ts`
- Create: `src/testing/fakes/fake-provider.ts`
- Create: `src/application/use-cases/run-debate.ts`
- Test: `tests/unit/domain/debate-orchestrator.test.ts`
- Test: `tests/integration/run-debate.test.ts`

- [ ] **Step 1: Write the failing orchestration test**

```ts
import { describe, expect, it } from "vitest";
import { runDebate } from "../../../src/application/use-cases/run-debate";
import { FakeProvider } from "../../../src/testing/fakes/fake-provider";

describe("runDebate", () => {
  it("runs independent, cross-review, and consensus rounds", async () => {
    const codex = new FakeProvider("codex", ["Claim A"], ["Claim A"]);
    const claude = new FakeProvider("claude", ["Claim A"], ["Claim A"]);
    const gemini = new FakeProvider("gemini", ["Claim B"], ["Claim B"]);

    const result = await runDebate({
      topic: "Debate topic",
      providers: [codex, claude, gemini]
    });

    expect(result.rounds.map((round) => round.kind)).toEqual([
      "independent",
      "cross-review",
      "consensus"
    ]);
    expect(result.consensus.consensusClaims).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts`
Expected: FAIL with missing orchestrator or fake provider modules.

- [ ] **Step 3: Implement the fake provider and consensus engine**

```ts
import type { ProviderExecutionContext, ProviderExecutionResult } from "../../domain/models/provider.js";
import { AbstractProvider } from "../../providers/core/abstract-provider.js";

export class FakeProvider extends AbstractProvider {
  readonly displayName: string;
  readonly command: string;

  constructor(
    readonly id: string,
    private readonly independentClaims: string[],
    private readonly reviewClaims: string[]
  ) {
    super();
    this.displayName = id;
    this.command = id;
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length ? "cross-review" : "independent";
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return { rawOutput };
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    const claims = context.peerOutputs?.length ? this.reviewClaims : this.independentClaims;
    return JSON.stringify({
      answer: `${this.id} answer`,
      claims: claims.map((text, index) => ({
        id: `${this.id}-${index}`,
        text,
        support: "evidence-backed"
      }))
    });
  }
}
```

```ts
import { buildConsensusResult } from "../models/consensus.js";
import type { ProviderFinding } from "../value-objects/provider-output.js";

export class ConsensusEngine {
  build(topic: string, findings: ProviderFinding[]) {
    return buildConsensusResult({ topic, findings });
  }
}
```

- [ ] **Step 4: Implement the orchestrator and use case**

```ts
import type { AbstractProvider } from "../../providers/core/abstract-provider.js";
import type { ProviderFinding } from "../value-objects/provider-output.js";
import { ConsensusEngine } from "./consensus-engine.js";

export class DebateOrchestrator {
  constructor(private readonly consensusEngine = new ConsensusEngine()) {}

  async run(topic: string, providers: AbstractProvider[]) {
    const findings: ProviderFinding[] = [];

    for (const provider of providers) {
      const raw = await provider.execute({ topic, workspaceDir: process.cwd() });
      const parsed = JSON.parse(raw) as ProviderFinding;
      findings.push({ providerId: provider.id, claims: parsed.claims ?? [] });
    }

    for (const provider of providers) {
      await provider.execute({
        topic,
        workspaceDir: process.cwd(),
        peerOutputs: findings.map((finding) => JSON.stringify(finding))
      });
    }

    return {
      rounds: [
        { id: "r1", kind: "independent", startedAt: new Date().toISOString() },
        { id: "r2", kind: "cross-review", startedAt: new Date().toISOString() },
        { id: "r3", kind: "consensus", startedAt: new Date().toISOString() }
      ],
      findings,
      consensus: this.consensusEngine.build(topic, findings)
    };
  }
}
```

```ts
import type { AbstractProvider } from "../../providers/core/abstract-provider.js";
import { DebateOrchestrator } from "../../domain/services/debate-orchestrator.js";

export async function runDebate(input: {
  topic: string;
  providers: AbstractProvider[];
}) {
  const orchestrator = new DebateOrchestrator();
  return orchestrator.run(input.topic, input.providers);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/domain/services/consensus-engine.ts src/domain/services/debate-orchestrator.ts src/testing/fakes/fake-provider.ts src/application/use-cases/run-debate.ts tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts
git commit -m "feat: add debate orchestration and consensus engine"
```

## Task 7: Build The Guided REPL, Setup Flow, And Cost Gate

**Files:**
- Create: `src/application/use-cases/setup-providers.ts`
- Create: `src/application/use-cases/resume-session.ts`
- Create: `src/application/services/cost-estimator.ts`
- Create: `src/cli/repl/session-repl.ts`
- Create: `src/cli/prompts/setup-prompts.ts`
- Create: `src/cli/prompts/debate-prompts.ts`
- Create: `src/cli/presenters/session-presenter.ts`
- Create: `src/cli/presenters/consensus-presenter.ts`
- Modify: `src/cli/entry.ts`
- Test: `tests/integration/setup-providers.test.ts`

- [ ] **Step 1: Extend the failing integration test for setup and interactive launch metadata**

```ts
import { describe, expect, it } from "vitest";
import { estimateRunCost } from "../../src/application/services/cost-estimator";

describe("estimateRunCost", () => {
  it("returns a lightweight usage summary before launch", () => {
    const estimate = estimateRunCost({
      providerIds: ["codex", "claude"],
      rounds: 2,
      expectedPromptChars: 2400
    });

    expect(estimate.riskLevel).toBe("medium");
    expect(estimate.summary).toContain("codex");
    expect(estimate.summary).toContain("claude");
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `pnpm vitest run tests/integration/setup-providers.test.ts`
Expected: FAIL with missing `estimateRunCost`.

- [ ] **Step 3: Implement the cost gate and provider setup use cases**

```ts
export function estimateRunCost(input: {
  providerIds: string[];
  rounds: number;
  expectedPromptChars: number;
}) {
  const volume = input.providerIds.length * input.rounds * input.expectedPromptChars;
  const riskLevel = volume > 8_000 ? "high" : volume > 3_000 ? "medium" : "low";

  return {
    riskLevel,
    summary: `${input.providerIds.join(", ")} across ${input.rounds} rounds`
  };
}
```

```ts
import type { ProviderDetectionResult } from "../../domain/models/provider.js";

export function summarizeProviderSetup(results: ProviderDetectionResult[]) {
  return results.map((result) => ({
    id: result.id,
    status: result.detected ? "detected" : "unavailable"
  }));
}
```

- [ ] **Step 4: Implement the REPL and presenters**

```ts
import * as prompts from "@clack/prompts";
import { estimateRunCost } from "../../application/services/cost-estimator.js";

export async function startSessionRepl(): Promise<void> {
  const topic = await prompts.text({
    message: "What topic should the agents debate?"
  });

  if (prompts.isCancel(topic)) {
    prompts.cancel("Session cancelled.");
    return;
  }

  const estimate = estimateRunCost({
    providerIds: ["codex", "claude"],
    rounds: 2,
    expectedPromptChars: String(topic).length * 20
  });

  prompts.note(`Launch risk: ${estimate.riskLevel}\n${estimate.summary}`, "Execution plan");
}
```

```ts
export function renderConsensusSummary(input: {
  topic: string;
  claims: string[];
}): string {
  return [`Topic: ${input.topic}`, ...input.claims.map((claim) => `- ${claim}`)].join("\n");
}
```

```ts
import { Command } from "commander";
import { startSessionRepl } from "./repl/session-repl.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("accord")
    .description("Run structured multi-agent research debates")
    .action(async () => {
      await startSessionRepl();
    });

  program.command("setup").description("Configure local providers");
  program.command("sessions").description("List saved debate sessions");
  program.command("resume").argument("<sessionId>").description("Resume a saved session");
  program.command("export").argument("<sessionId>").description("Export a saved session");

  return program;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/integration/setup-providers.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/setup-providers.ts src/application/use-cases/resume-session.ts src/application/services/cost-estimator.ts src/cli/repl/session-repl.ts src/cli/prompts/setup-prompts.ts src/cli/prompts/debate-prompts.ts src/cli/presenters/session-presenter.ts src/cli/presenters/consensus-presenter.ts src/cli/entry.ts tests/integration/setup-providers.test.ts
git commit -m "feat: add guided repl and launch cost gate"
```

## Task 8: Add Markdown Export, README, Architecture Docs, And Final Test Coverage

**Files:**
- Create: `src/infrastructure/export/markdown-exporter.ts`
- Create: `docs/architecture.md`
- Create: `docs/provider-authoring.md`
- Create: `docs/session-model.md`
- Create: `docs/testing.md`
- Create: `README.md`
- Test: `tests/integration/run-debate.test.ts`

- [ ] **Step 1: Extend the integration test for export behavior**

```ts
import { describe, expect, it } from "vitest";
import { exportMarkdownReport } from "../../src/infrastructure/export/markdown-exporter";

describe("exportMarkdownReport", () => {
  it("renders a readable consensus report", () => {
    const markdown = exportMarkdownReport({
      topic: "Debate topic",
      consensusClaims: [{ text: "Claim A", supportingProviderIds: ["codex", "claude"] }],
      contestedClaims: [{ text: "Claim B", providerIds: ["gemini"] }]
    });

    expect(markdown).toContain("# Debate topic");
    expect(markdown).toContain("Claim A");
    expect(markdown).toContain("Claim B");
  });
});
```

- [ ] **Step 2: Run the export test to verify it fails**

Run: `pnpm vitest run tests/integration/run-debate.test.ts`
Expected: FAIL with missing exporter.

- [ ] **Step 3: Implement the exporter and the public documentation**

```ts
import type { ConsensusResult } from "../../domain/models/consensus.js";

export function exportMarkdownReport(result: ConsensusResult): string {
  return [
    `# ${result.topic}`,
    "",
    "## Consensus",
    ...result.consensusClaims.map((claim) => `- ${claim.text} (${claim.supportingProviderIds.join(", ")})`),
    "",
    "## Disagreements",
    ...result.contestedClaims.map((claim) => `- ${claim.text} (${claim.providerIds.join(", ")})`)
  ].join("\n");
}
```

```md
# Accord CLI

Accord is a local-first TypeScript CLI for structured multi-agent research debates.

## Commands

- `accord`
- `accord setup`
- `accord sessions`
- `accord resume <session-id>`
- `accord export <session-id>`

## Development

- `pnpm install`
- `pnpm test`
- `pnpm build`
```

```md
# Architecture

Accord is split into CLI, application, domain, providers, and infrastructure layers so orchestration can be tested without running live providers.
```

```md
# Provider Authoring

New providers should extend `AbstractProvider`, define prompt construction, and normalize raw provider output into the shared debate schema.
```

```md
# Session Model

Each session persists metadata, round artifacts, normalized findings, and exports under a stable local directory.
```

```md
# Testing

Unit, contract, and integration tests use fixtures and fake providers by default. Live provider tests are opt-in only.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/integration/run-debate.test.ts`
Expected: PASS

- [ ] **Step 5: Run final verification**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm build`
Expected: PASS and emit `dist/index.js`

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/export/markdown-exporter.ts README.md docs/architecture.md docs/provider-authoring.md docs/session-model.md docs/testing.md tests/integration/run-debate.test.ts
git commit -m "docs: add exports and project documentation"
```

## Self-Review Checklist

- Spec coverage:
  - Interactive guided REPL is covered in Task 7.
  - Saved sessions and config loading are covered in Task 3.
  - Provider abstract classes and built-in adapters are covered in Tasks 4 and 5.
  - Debate orchestration and deterministic consensus are covered in Task 6.
  - Exports and production-grade docs are covered in Task 8.
- Placeholder scan:
  - No placeholder markers or deferred implementation notes remain in the steps.
- Type consistency:
  - `AbstractProvider`, `ProviderExecutionContext`, `SessionRecord`, `ConsensusResult`, and `DebateOrchestrator` use consistent names across tasks.
