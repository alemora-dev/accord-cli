# Accord CLI Product Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Accord from a verified scaffold into a usable end-to-end debate CLI with live execution, full session artifacts, hybrid final-answer presentation, follow-up memory, and complete session commands.

**Architecture:** Extend the existing CLI/application/domain/providers/infrastructure split without re-architecting it. The work centers on wiring the live debate path, preserving richer artifacts through orchestration and persistence, then presenting and reusing those artifacts through the CLI.

**Tech Stack:** TypeScript, Node.js, Commander, @clack/prompts, Zod, Execa, Vitest, TSUP

---

## File Structure

### Files To Modify

- Modify: `src/application/use-cases/run-debate.ts`
- Modify: `src/application/use-cases/resume-session.ts`
- Modify: `src/application/use-cases/setup-providers.ts`
- Modify: `src/cli/entry.ts`
- Modify: `src/cli/repl/session-repl.ts`
- Modify: `src/cli/presenters/session-presenter.ts`
- Modify: `src/cli/presenters/consensus-presenter.ts`
- Modify: `src/domain/models/consensus.ts`
- Modify: `src/domain/models/debate.ts`
- Modify: `src/domain/models/session.ts`
- Modify: `src/domain/services/consensus-engine.ts`
- Modify: `src/domain/services/debate-orchestrator.ts`
- Modify: `src/domain/value-objects/provider-output.ts`
- Modify: `src/infrastructure/export/markdown-exporter.ts`
- Modify: `src/infrastructure/fs/session-repository.ts`
- Modify: `src/providers/core/abstract-provider.ts`

### New Files

- Create: `src/application/use-cases/export-session.ts`
- Create: `src/application/use-cases/list-sessions.ts`
- Create: `src/application/use-cases/follow-up-debate.ts`
- Create: `src/cli/presenters/debate-result-presenter.ts`
- Create: `src/cli/presenters/session-list-presenter.ts`
- Create: `src/cli/prompts/follow-up-prompts.ts`
- Create: `src/domain/services/final-answer-synthesizer.ts`
- Create: `src/domain/value-objects/debate-artifacts.ts`
- Create: `src/infrastructure/fs/session-artifact-store.ts`

### Tests To Add Or Extend

- Modify: `tests/integration/run-debate.test.ts`
- Modify: `tests/integration/setup-providers.test.ts`
- Modify: `tests/unit/domain/debate-orchestrator.test.ts`
- Modify: `tests/unit/infrastructure/session-repository.test.ts`
- Create: `tests/unit/domain/final-answer-synthesizer.test.ts`
- Create: `tests/integration/export-session.test.ts`
- Create: `tests/integration/list-sessions.test.ts`
- Create: `tests/integration/follow-up-debate.test.ts`

## Task 1: Preserve Rich Provider Artifacts Through Orchestration

**Files:**
- Create: `src/domain/value-objects/debate-artifacts.ts`
- Modify: `src/domain/value-objects/provider-output.ts`
- Modify: `src/domain/services/debate-orchestrator.ts`
- Modify: `src/domain/models/debate.ts`
- Modify: `tests/unit/domain/debate-orchestrator.test.ts`
- Modify: `tests/integration/run-debate.test.ts`

- [ ] **Step 1: Write the failing test for reviewed artifact preservation**

```ts
import { describe, expect, it } from "vitest";
import { DebateOrchestrator } from "../../../src/domain/services/debate-orchestrator.js";
import { FakeProvider } from "../../../src/testing/fakes/fake-provider.js";

describe("DebateOrchestrator artifacts", () => {
  it("returns independent and review artifacts separately", async () => {
    const codex = new FakeProvider("codex", ["Initial A"], ["Reviewed A"]);
    const gemini = new FakeProvider("gemini", ["Initial B"], ["Reviewed A"]);

    const result = await new DebateOrchestrator().run("Topic", [codex, gemini]);

    expect(result.independentFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Initial A",
      "Initial B"
    ]);
    expect(result.reviewFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Reviewed A",
      "Reviewed A"
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts`
Expected: FAIL because the orchestrator does not yet return separate independent and review findings.

- [ ] **Step 3: Add richer debate artifact types**

```ts
export interface ProviderArtifact {
  providerId: string;
  rawOutput: string;
  normalized: ProviderFinding;
}

export interface DebateArtifacts {
  independentArtifacts: ProviderArtifact[];
  reviewArtifacts: ProviderArtifact[];
}
```

```ts
export interface DebateRun {
  topic: string;
  selectedProviderIds: string[];
  rounds: DebateRound[];
  findings: ProviderFinding[];
  independentFindings: ProviderFinding[];
  reviewFindings: ProviderFinding[];
}
```

- [ ] **Step 4: Update orchestrator to keep both phases**

```ts
const independentArtifacts: ProviderArtifact[] = [];

for (const provider of providers) {
  const rawOutput = await provider.execute({ topic, workspaceDir });
  const normalized = parseFinding(provider.id, rawOutput);
  independentArtifacts.push({
    providerId: provider.id,
    rawOutput,
    normalized
  });
}

const reviewArtifacts: ProviderArtifact[] = [];

for (const provider of providers) {
  const peerOutputs = independentArtifacts
    .filter((artifact) => artifact.providerId !== provider.id)
    .map((artifact) => artifact.rawOutput);
  const rawOutput = await provider.execute({
    topic,
    workspaceDir,
    peerOutputs
  });
  const normalized = parseFinding(provider.id, rawOutput);
  reviewArtifacts.push({
    providerId: provider.id,
    rawOutput,
    normalized
  });
}

return {
  topic,
  selectedProviderIds: providers.map((provider) => provider.id),
  rounds,
  findings: reviewArtifacts.map((artifact) => artifact.normalized),
  independentFindings: independentArtifacts.map((artifact) => artifact.normalized),
  reviewFindings: reviewArtifacts.map((artifact) => artifact.normalized),
  consensus: this.consensusEngine.build(
    topic,
    reviewArtifacts.map((artifact) => artifact.normalized)
  )
};
```

- [ ] **Step 5: Extend tests to assert review-phase consensus**

Run: `npm test -- tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/domain/value-objects/debate-artifacts.ts src/domain/value-objects/provider-output.ts src/domain/models/debate.ts src/domain/services/debate-orchestrator.ts tests/unit/domain/debate-orchestrator.test.ts tests/integration/run-debate.test.ts
git commit -m "feat: preserve debate artifacts across rounds"
```

## Task 2: Add Deterministic Final Answer Synthesis

**Files:**
- Create: `src/domain/services/final-answer-synthesizer.ts`
- Modify: `src/domain/models/consensus.ts`
- Modify: `src/domain/services/consensus-engine.ts`
- Create: `tests/unit/domain/final-answer-synthesizer.test.ts`

- [ ] **Step 1: Write the failing test for final answer synthesis**

```ts
import { describe, expect, it } from "vitest";
import { FinalAnswerSynthesizer } from "../../../src/domain/services/final-answer-synthesizer.js";

describe("FinalAnswerSynthesizer", () => {
  it("builds a short answer and explanation from consensus data", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const result = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [{ text: "The sky is blue.", supportingProviderIds: ["codex", "gemini"] }],
      contestedClaims: [{ text: "The sky is gray.", providerIds: ["claude"] }]
    });

    expect(result.answer).toContain("blue");
    expect(result.whyItWon).toContain("codex");
    expect(result.disagreements[0]).toContain("gray");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/domain/final-answer-synthesizer.test.ts`
Expected: FAIL with missing synthesizer.

- [ ] **Step 3: Implement the deterministic synthesizer**

```ts
export interface FinalAnswerResult {
  answer: string;
  whyItWon: string;
  disagreements: string[];
  openQuestions: string[];
}

export class FinalAnswerSynthesizer {
  build(input: ConsensusResult): FinalAnswerResult {
    const winningClaim = input.consensusClaims[0];

    return {
      answer: winningClaim ? winningClaim.text : "No clear consensus was reached.",
      whyItWon: winningClaim
        ? `Supported by ${winningClaim.supportingProviderIds.join(", ")} after review.`
        : "No claim had enough support after review.",
      disagreements: input.contestedClaims.map(
        (claim) => `${claim.text} (${claim.providerIds.join(", ")})`
      ),
      openQuestions: []
    };
  }
}
```

- [ ] **Step 4: Wire synthesis into consensus service**

```ts
import { FinalAnswerSynthesizer } from "./final-answer-synthesizer.js";

export class ConsensusEngine {
  private readonly synthesizer = new FinalAnswerSynthesizer();

  build(topic: string, findings: ProviderFinding[]) {
    const consensus = buildConsensusResult({ topic, findings });
    return {
      ...consensus,
      finalAnswer: this.synthesizer.build(consensus)
    };
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/domain/final-answer-synthesizer.test.ts tests/unit/domain/consensus-engine.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/domain/services/final-answer-synthesizer.ts src/domain/models/consensus.ts src/domain/services/consensus-engine.ts tests/unit/domain/final-answer-synthesizer.test.ts
git commit -m "feat: add deterministic final answer synthesis"
```

## Task 3: Persist Full Debate Sessions And Artifacts

**Files:**
- Create: `src/infrastructure/fs/session-artifact-store.ts`
- Modify: `src/infrastructure/fs/session-repository.ts`
- Modify: `src/domain/models/session.ts`
- Modify: `src/application/use-cases/run-debate.ts`
- Modify: `tests/unit/infrastructure/session-repository.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
import { describe, expect, it } from "vitest";
import { SessionRepository } from "../../../src/infrastructure/fs/session-repository.js";

describe("SessionRepository artifacts", () => {
  it("stores the final answer and round findings in the session record", async () => {
    const repository = new SessionRepository("/tmp/accord-session-test");

    await repository.save({
      id: "session-1",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
      title: "Sky debate",
      run: {
        topic: "What color is the sky?",
        selectedProviderIds: ["codex", "gemini"],
        rounds: [],
        findings: [],
        independentFindings: [],
        reviewFindings: []
      }
    });

    const session = await repository.get("session-1");
    expect(session?.run?.topic).toBe("What color is the sky?");
  });
});
```

- [ ] **Step 2: Run test to verify it fails if the shape is incomplete**

Run: `npm test -- tests/unit/infrastructure/session-repository.test.ts`
Expected: FAIL until repository and session model are updated for richer run data.

- [ ] **Step 3: Extend session model and save path**

```ts
export interface SessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  run?: DebateRun;
  finalAnswer?: FinalAnswerResult;
}
```

```ts
export class SessionArtifactStore {
  constructor(private readonly repository: SessionRepository) {}

  async saveDebateSession(input: {
    sessionId: string;
    title: string;
    result: DebateOrchestrationResult;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.repository.save({
      id: input.sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      title: input.title,
      run: input.result,
      finalAnswer: input.result.consensus.finalAnswer
    });
  }
}
```

- [ ] **Step 4: Save run results from `runDebate()`**

```ts
export async function runDebate(input: {
  topic: string;
  providers: AbstractProvider[];
  artifactStore?: SessionArtifactStore;
  sessionId?: string;
}) {
  const orchestrator = new DebateOrchestrator();
  const result = await orchestrator.run(input.topic, input.providers);

  if (input.artifactStore && input.sessionId) {
    await input.artifactStore.saveDebateSession({
      sessionId: input.sessionId,
      title: input.topic,
      result
    });
  }

  return result;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/infrastructure/session-repository.test.ts tests/integration/run-debate.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/fs/session-artifact-store.ts src/infrastructure/fs/session-repository.ts src/domain/models/session.ts src/application/use-cases/run-debate.ts tests/unit/infrastructure/session-repository.test.ts
git commit -m "feat: persist full debate sessions"
```

## Task 4: Present The Hybrid Final Answer In The CLI

**Files:**
- Create: `src/cli/presenters/debate-result-presenter.ts`
- Modify: `src/cli/presenters/consensus-presenter.ts`
- Modify: `src/cli/presenters/session-presenter.ts`
- Modify: `src/cli/repl/session-repl.ts`
- Modify: `src/application/use-cases/run-debate.ts`
- Modify: `tests/integration/run-debate.test.ts`

- [ ] **Step 1: Write the failing presentation test**

```ts
import { describe, expect, it } from "vitest";
import { renderDebateResult } from "../../src/cli/presenters/debate-result-presenter.js";

describe("renderDebateResult", () => {
  it("renders a short answer followed by explanation sections", () => {
    const output = renderDebateResult({
      topic: "What color is the sky?",
      finalAnswer: {
        answer: "The sky is blue.",
        whyItWon: "Supported by codex and gemini after review.",
        disagreements: ["The sky is gray. (claude)"],
        openQuestions: []
      },
      reviewFindings: [
        { providerId: "codex", claims: [{ id: "1", text: "The sky is blue.", support: "evidence-backed" }] }
      ]
    });

    expect(output).toContain("Final answer");
    expect(output).toContain("The sky is blue.");
    expect(output).toContain("Why this won");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/run-debate.test.ts`
Expected: FAIL with missing debate result presenter.

- [ ] **Step 3: Implement the presenter**

```ts
export function renderDebateResult(input: {
  topic: string;
  finalAnswer: FinalAnswerResult;
  reviewFindings: ProviderFinding[];
}): string {
  return [
    "Final answer",
    input.finalAnswer.answer,
    "",
    "Why this won",
    input.finalAnswer.whyItWon,
    "",
    "Disagreements",
    ...(input.finalAnswer.disagreements.length > 0
      ? input.finalAnswer.disagreements
      : ["None"]),
    "",
    "Agent summaries",
    ...input.reviewFindings.map(
      (finding) =>
        `- ${finding.providerId}: ${finding.claims.map((claim) => claim.text).join("; ")}`
    )
  ].join("\n");
}
```

- [ ] **Step 4: Show final debate results in the REPL**

```ts
const result = await runDebate({
  topic,
  providers,
  artifactStore,
  sessionId
});

note(
  renderDebateResult({
    topic,
    finalAnswer: result.consensus.finalAnswer,
    reviewFindings: result.reviewFindings
  }),
  "Debate result"
);
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/integration/run-debate.test.ts tests/integration/setup-providers.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/cli/presenters/debate-result-presenter.ts src/cli/presenters/consensus-presenter.ts src/cli/presenters/session-presenter.ts src/cli/repl/session-repl.ts src/application/use-cases/run-debate.ts tests/integration/run-debate.test.ts
git commit -m "feat: present hybrid debate results"
```

## Task 5: Add Follow-Up Questions Over Saved Session Context

**Files:**
- Create: `src/application/use-cases/follow-up-debate.ts`
- Create: `src/cli/prompts/follow-up-prompts.ts`
- Modify: `src/cli/repl/session-repl.ts`
- Modify: `src/domain/models/session.ts`
- Create: `tests/integration/follow-up-debate.test.ts`

- [ ] **Step 1: Write the failing follow-up test**

```ts
import { describe, expect, it } from "vitest";
import { followUpDebate } from "../../src/application/use-cases/follow-up-debate.js";

describe("followUpDebate", () => {
  it("answers from stored session context without rerunning providers", async () => {
    const result = await followUpDebate({
      session: {
        id: "session-1",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:00.000Z",
        title: "Sky debate",
        finalAnswer: {
          answer: "The sky is blue.",
          whyItWon: "Supported by codex and gemini after review.",
          disagreements: [],
          openQuestions: []
        }
      },
      question: "What did they agree on?"
    });

    expect(result.answer).toContain("blue");
    expect(result.rerun).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/follow-up-debate.test.ts`
Expected: FAIL with missing follow-up use case.

- [ ] **Step 3: Implement the follow-up use case**

```ts
export async function followUpDebate(input: {
  session: SessionRecord;
  question: string;
}) {
  const answer = input.session.finalAnswer
    ? `From the saved debate: ${input.session.finalAnswer.answer}`
    : "No saved final answer is available for this session.";

  return {
    answer,
    rerun: false
  };
}
```

- [ ] **Step 4: Add a follow-up loop in the REPL**

```ts
const followUpQuestion = await promptForFollowUp();

if (followUpQuestion) {
  const followUpResult = await followUpDebate({
    session,
    question: followUpQuestion
  });
  note(followUpResult.answer, "Follow-up");
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/integration/follow-up-debate.test.ts tests/integration/setup-providers.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/follow-up-debate.ts src/cli/prompts/follow-up-prompts.ts src/cli/repl/session-repl.ts src/domain/models/session.ts tests/integration/follow-up-debate.test.ts
git commit -m "feat: add follow-up session memory"
```

## Task 6: Complete `sessions`, `resume`, And `export`

**Files:**
- Create: `src/application/use-cases/list-sessions.ts`
- Create: `src/application/use-cases/export-session.ts`
- Create: `src/cli/presenters/session-list-presenter.ts`
- Modify: `src/cli/entry.ts`
- Modify: `src/infrastructure/export/markdown-exporter.ts`
- Create: `tests/integration/list-sessions.test.ts`
- Create: `tests/integration/export-session.test.ts`

- [ ] **Step 1: Write the failing command-coverage tests**

```ts
import { describe, expect, it } from "vitest";
import { renderSessionList } from "../../src/cli/presenters/session-list-presenter.js";

describe("renderSessionList", () => {
  it("renders saved sessions for the CLI", () => {
    const output = renderSessionList([
      { id: "session-1", title: "Sky debate", updatedAt: "2026-04-03T00:00:00.000Z" }
    ]);

    expect(output).toContain("session-1");
    expect(output).toContain("Sky debate");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/integration/list-sessions.test.ts tests/integration/export-session.test.ts`
Expected: FAIL with missing session list/export files.

- [ ] **Step 3: Implement list and export use cases**

```ts
export async function listSessions(input: {
  repository: { list(): Promise<SessionRecord[]> };
}) {
  return input.repository.list();
}
```

```ts
export async function exportSession(input: {
  session: SessionRecord;
}) {
  if (!input.session.run?.consensus) {
    return {
      content: "No debate result is available to export."
    };
  }

  return {
    content: exportMarkdownReport(input.session.run.consensus)
  };
}
```

- [ ] **Step 4: Wire commands in `entry.ts`**

```ts
program.command("sessions").description("List saved debate sessions").action(async () => {
  const sessions = await listSessions({ repository });
  presentSessionList(renderSessionList(sessions));
});

program.command("export").argument("<sessionId>").description("Export a saved session").action(async (sessionId: string) => {
  const session = await repository.get(sessionId);
  if (!session) {
    presentSessionList("Session not found.");
    return;
  }

  const exported = await exportSession({ session });
  presentSessionList(exported.content);
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/integration/list-sessions.test.ts tests/integration/export-session.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/list-sessions.ts src/application/use-cases/export-session.ts src/cli/presenters/session-list-presenter.ts src/cli/entry.ts src/infrastructure/export/markdown-exporter.ts tests/integration/list-sessions.test.ts tests/integration/export-session.test.ts
git commit -m "feat: complete session listing and export commands"
```

## Self-Review Checklist

- Spec coverage:
  - Live debate execution is covered by Tasks 1 and 4.
  - Full artifact persistence is covered by Task 3.
  - Hybrid final answer presentation is covered by Tasks 2 and 4.
  - Follow-up memory is covered by Task 5.
  - Session commands are covered by Task 6.
- Placeholder scan:
  - No `TODO`, `TBD`, or deferred implementation markers remain in the steps.
- Type consistency:
  - `DebateRun`, `SessionRecord`, `ConsensusResult`, `FinalAnswerResult`, and provider artifacts are used consistently across tasks.

