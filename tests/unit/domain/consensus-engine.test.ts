import { describe, expect, it } from "vitest";
import { ConsensusEngine } from "../../../src/domain/services/consensus-engine.js";

describe("ConsensusEngine", () => {
  it("keeps supported claims and exposes contested ones", () => {
    const result = new ConsensusEngine().build("Topic", [
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
    ]);

    expect(result.consensusClaims).toHaveLength(1);
    expect(result.consensusClaims[0]?.text).toBe("Claim A");
    expect(result.contestedClaims).toHaveLength(1);
    expect(result.finalAnswer).toEqual({
      answer: "Claim A",
      whyItWon: "Supported by codex and claude after review.",
      disagreements: ["Claim B (gemini)"],
      openQuestions: []
    });
  });
});
