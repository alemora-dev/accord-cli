import { describe, expect, expectTypeOf, it } from "vitest";
import type { ConsensusResult } from "../../../src/domain/models/consensus.js";
import { exportMarkdownReport } from "../../../src/infrastructure/export/markdown-exporter.js";

describe("exportMarkdownReport", () => {
  it("renders the synthesized final answer content", () => {
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
    } satisfies ConsensusResult);

    expect(markdown).toContain("## Final answer");
    expect(markdown).toContain("Claim A");
    expect(markdown).toContain("Why this won");
  });

  it("requires the stronger consensus result contract", () => {
    expectTypeOf(exportMarkdownReport).parameter(0).toEqualTypeOf<ConsensusResult>();
  });
});
