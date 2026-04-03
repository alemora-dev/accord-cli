import { describe, expect, it } from "vitest";
import type { ProviderExecutionContext } from "../../../src/domain/models/provider.js";
import { DebateOrchestrator } from "../../../src/domain/services/debate-orchestrator.js";
import { AbstractProvider } from "../../../src/providers/core/abstract-provider.js";
import { FakeProvider } from "../../../src/testing/fakes/fake-provider.js";

class RichProvider extends AbstractProvider {
  readonly displayName: string;
  readonly command: string;
  normalizeCalls = 0;
  readonly executionContexts: ProviderExecutionContext[] = [];

  constructor(
    readonly id: string,
    private readonly independentPayload: Record<string, unknown>,
    private readonly reviewPayload: Record<string, unknown>
  ) {
    super();
    this.displayName = id;
    this.command = id;
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerFindings?.length ? "cross-review" : "independent";
  }

  normalize(rawOutput: string) {
    this.normalizeCalls += 1;

    const parsed = JSON.parse(rawOutput) as Record<string, unknown>;

    return {
      providerId: this.id,
      claims: parsed.claims as never[],
      evidence: parsed.evidence as never[],
      confidence: parsed.confidence as number | undefined
    };
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    this.executionContexts.push({
      topic: context.topic,
      workspaceDir: context.workspaceDir,
      peerFindings: context.peerFindings ? context.peerFindings.map((finding) => ({ ...finding })) : undefined
    });

    return JSON.stringify(context.peerFindings?.length ? this.reviewPayload : this.independentPayload);
  }
}

describe("DebateOrchestrator", () => {
  it("uses cross-review findings to build final consensus", async () => {
    const codex = new FakeProvider("codex", ["Claim A"], ["Shared claim"]);
    const claude = new FakeProvider("claude", ["Claim B"], ["Shared claim"]);
    const gemini = new FakeProvider("gemini", ["Claim C"], ["Different review claim"]);

    const result = await new DebateOrchestrator().run("Debate topic", [
      codex,
      claude,
      gemini
    ]);

    expect(result.rounds.map((round) => round.kind)).toEqual([
      "independent",
      "cross-review",
      "consensus"
    ]);
    expect(result.consensus.consensusClaims).toEqual([
      {
        text: "Shared claim",
        supportingProviderIds: ["claude", "codex"]
      }
    ]);
    expect(result.findings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Shared claim",
      "Shared claim",
      "Different review claim"
    ]);
    expect(codex.executionContexts).toHaveLength(2);
    expect(codex.executionContexts[1]?.peerFindings).toEqual([
      {
        providerId: "claude",
        claims: [{ id: "claude-0", text: "Claim B", support: "evidence-backed" }]
      },
      {
        providerId: "gemini",
        claims: [{ id: "gemini-0", text: "Claim C", support: "evidence-backed" }]
      }
    ]);
  });

  it("returns independent and review findings separately", async () => {
    const codex = new RichProvider(
      "codex",
      {
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Initial A", support: "evidence-backed" }],
        evidence: [{ id: "codex-e0", summary: "codex independent evidence" }],
        confidence: 0.41
      },
      {
        answer: "codex review answer",
        claims: [{ id: "codex-0", text: "Reviewed A", support: "evidence-backed" }],
        evidence: [{ id: "codex-r0", summary: "codex review evidence" }],
        confidence: 0.91
      }
    );
    const gemini = new RichProvider(
      "gemini",
      {
        answer: "gemini answer",
        claims: [{ id: "gemini-0", text: "Initial B", support: "evidence-backed" }],
        evidence: [{ id: "gemini-e0", summary: "gemini independent evidence" }],
        confidence: 0.52
      },
      {
        answer: "gemini review answer",
        claims: [{ id: "gemini-0", text: "Reviewed A", support: "evidence-backed" }],
        evidence: [{ id: "gemini-r0", summary: "gemini review evidence" }],
        confidence: 0.88
      }
    );

    const result = await new DebateOrchestrator().run("Topic", [codex, gemini]);

    expect(result.independentFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Initial A",
      "Initial B"
    ]);
    expect(result.reviewFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Reviewed A",
      "Reviewed A"
    ]);
    expect(result.independentArtifacts.map((artifact) => artifact.rawOutput)).toEqual([
      JSON.stringify({
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Initial A", support: "evidence-backed" }],
        evidence: [{ id: "codex-e0", summary: "codex independent evidence" }],
        confidence: 0.41
      }),
      JSON.stringify({
        answer: "gemini answer",
        claims: [{ id: "gemini-0", text: "Initial B", support: "evidence-backed" }],
        evidence: [{ id: "gemini-e0", summary: "gemini independent evidence" }],
        confidence: 0.52
      })
    ]);
    expect(result.reviewArtifacts[0]?.normalized.confidence).toBe(0.91);
    expect(result.reviewArtifacts[0]?.normalized.evidence).toEqual([
      { id: "codex-r0", summary: "codex review evidence" }
    ]);
    expect(codex.normalizeCalls).toBe(2);
    expect(gemini.normalizeCalls).toBe(2);
  });

  it("calls provider normalization for each phase", async () => {
    const codex = new RichProvider(
      "codex",
      {
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Initial A", support: "evidence-backed" }],
        evidence: [{ id: "codex-e0", summary: "codex independent evidence" }],
        confidence: 0.41
      },
      {
        answer: "codex review answer",
        claims: [{ id: "codex-0", text: "Reviewed A", support: "evidence-backed" }],
        evidence: [{ id: "codex-r0", summary: "codex review evidence" }],
        confidence: 0.91
      }
    );

    const result = await new DebateOrchestrator().run("Topic", [codex]);

    expect(codex.normalizeCalls).toBe(1);
    expect(result.rounds.map((round) => round.kind)).toEqual(["independent", "consensus"]);
    expect(result.reviewArtifacts).toHaveLength(0);
    expect(result.findings.map((finding) => finding.claims[0]?.text)).toEqual(["Initial A"]);
    expect(result.consensus.contestedClaims).toEqual([
      { text: "Initial A", providerIds: ["codex"] }
    ]);
  });

  it("forwards structured peer findings into cross-review prompts", async () => {
    const codex = new RichProvider(
      "codex",
      {
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Initial A", support: "evidence-backed" }],
        evidence: [{ id: "codex-e0", summary: "codex independent evidence" }],
        confidence: 0.41
      },
      {
        answer: "codex review answer",
        claims: [{ id: "codex-0", text: "Reviewed A", support: "evidence-backed" }],
        evidence: [{ id: "codex-r0", summary: "codex review evidence" }],
        confidence: 0.91
      }
    );
    const gemini = new RichProvider(
      "gemini",
      {
        answer: "gemini answer",
        claims: [{ id: "gemini-0", text: "Initial B", support: "evidence-backed" }],
        evidence: [{ id: "gemini-e0", summary: "gemini independent evidence" }],
        confidence: 0.52
      },
      {
        answer: "gemini review answer",
        claims: [{ id: "gemini-0", text: "Reviewed A", support: "evidence-backed" }],
        evidence: [{ id: "gemini-r0", summary: "gemini review evidence" }],
        confidence: 0.88
      }
    );

    await new DebateOrchestrator().run("Topic", [codex, gemini]);

    const reviewContext = codex.executionContexts[1];
    expect(reviewContext?.peerFindings).toEqual([
      {
        providerId: "gemini",
        claims: [{ id: "gemini-0", text: "Initial B", support: "evidence-backed" }],
        evidence: [{ id: "gemini-e0", summary: "gemini independent evidence" }],
        confidence: 0.52
      }
    ]);
  });
});
