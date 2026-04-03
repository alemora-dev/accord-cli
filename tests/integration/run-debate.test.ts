import { describe, expect, it } from "vitest";
import { runDebate } from "../../src/application/use-cases/run-debate.js";
import { exportMarkdownReport } from "../../src/infrastructure/export/markdown-exporter.js";
import { FakeProvider } from "../../src/testing/fakes/fake-provider.js";

describe("runDebate", () => {
  it("returns consensus from the cross-review round", async () => {
    const codex = new FakeProvider("codex", ["Claim A"], ["Shared claim"]);
    const claude = new FakeProvider("claude", ["Claim B"], ["Shared claim"]);
    const gemini = new FakeProvider("gemini", ["Claim C"], ["Different review claim"]);

    const result = await runDebate({
      topic: "Debate topic",
      providers: [codex, claude, gemini]
    });

    expect(result.rounds.map((round) => round.kind)).toEqual([
      "independent",
      "cross-review",
      "consensus"
    ]);
    expect(result.consensus.consensusClaims).toEqual([
      {
        text: "Shared claim",
        strongestSupport: "evidence-backed",
        supportingProviderIds: ["claude", "codex"]
      }
    ]);
    expect(result.independentFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Claim A",
      "Claim B",
      "Claim C"
    ]);
    expect(result.reviewFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Shared claim",
      "Shared claim",
      "Different review claim"
    ]);
    expect(result.independentArtifacts.map((artifact) => artifact.rawOutput)).toEqual([
      JSON.stringify({
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Claim A", support: "evidence-backed" }]
      }),
      JSON.stringify({
        answer: "claude answer",
        claims: [{ id: "claude-0", text: "Claim B", support: "evidence-backed" }]
      }),
      JSON.stringify({
        answer: "gemini answer",
        claims: [{ id: "gemini-0", text: "Claim C", support: "evidence-backed" }]
      })
    ]);
    expect(result.reviewArtifacts.map((artifact) => artifact.rawOutput)).toEqual([
      JSON.stringify({
        answer: "codex answer",
        claims: [{ id: "codex-0", text: "Shared claim", support: "evidence-backed" }]
      }),
      JSON.stringify({
        answer: "claude answer",
        claims: [{ id: "claude-0", text: "Shared claim", support: "evidence-backed" }]
      }),
      JSON.stringify({
        answer: "gemini answer",
        claims: [
          { id: "gemini-0", text: "Different review claim", support: "evidence-backed" }
        ]
      })
    ]);
    expect(claude.executionContexts[1]?.peerFindings).toEqual([
      {
        providerId: "codex",
        claims: [{ id: "codex-0", text: "Claim A", support: "evidence-backed" }]
      },
      {
        providerId: "gemini",
        claims: [{ id: "gemini-0", text: "Claim C", support: "evidence-backed" }]
      }
    ]);
  });

  it("skips cross-review when only one provider is available", async () => {
    const codex = new FakeProvider("codex", ["Claim A"], ["Reviewed claim"]);

    const result = await runDebate({
      topic: "Debate topic",
      providers: [codex]
    });

    expect(result.rounds.map((round) => round.kind)).toEqual(["independent", "consensus"]);
    expect(result.independentArtifacts).toHaveLength(1);
    expect(result.reviewArtifacts).toHaveLength(0);
    expect(result.independentFindings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Claim A"
    ]);
    expect(result.findings.map((finding) => finding.claims[0]?.text)).toEqual(["Claim A"]);
    expect(codex.executionContexts).toHaveLength(1);
    expect(codex.executionContexts[0]?.peerFindings).toBeUndefined();
  });
});

describe("exportMarkdownReport", () => {
  it("renders a readable consensus report", () => {
    const markdown = exportMarkdownReport({
      topic: "Debate topic",
      consensusClaims: [
        {
          text: "Claim A",
          strongestSupport: "evidence-backed",
          supportingProviderIds: ["claude", "codex"]
        }
      ],
      contestedClaims: [{ text: "Claim B", providerIds: ["gemini"] }],
      finalAnswer: {
        answer: "Claim A",
        whyItWon: "Supported by claude and codex after review.",
        disagreements: ["Claim B (gemini)"],
        openQuestions: []
      }
    });

    expect(markdown).toContain("# Debate topic");
    expect(markdown).toContain("## Final answer");
    expect(markdown).toContain("Claim A");
    expect(markdown).toContain("Why this won");
    expect(markdown).toContain("Claim A");
    expect(markdown).toContain("Claim B");
  });
});
