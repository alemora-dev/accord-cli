import { describe, expect, it } from "vitest";
import { ConsensusEngine } from "../../../src/domain/services/consensus-engine.js";

describe("ConsensusEngine", () => {
  it("keeps supported claims and exposes contested ones in a stable order", () => {
    const result = new ConsensusEngine().build("Topic", [
      {
        providerId: "gemini",
        claims: [{ id: "c3", text: "Claim C", support: "unsupported" }]
      },
      {
        providerId: "claude",
        claims: [{ id: "c2", text: "Claim B", support: "evidence-backed" }]
      },
      {
        providerId: "codex",
        claims: [{ id: "c1", text: "Claim A", support: "evidence-backed" }]
      },
      {
        providerId: "claude",
        claims: [{ id: "c4", text: "Claim A", support: "evidence-backed" }]
      },
      {
        providerId: "gemini",
        claims: [{ id: "c5", text: "Claim B", support: "evidence-backed" }]
      }
    ]);

    expect(result.consensusClaims).toEqual([
      {
        text: "Claim A",
        supportingProviderIds: ["claude", "codex"]
      },
      {
        text: "Claim B",
        supportingProviderIds: ["claude", "gemini"]
      }
    ]);
    expect(result.contestedClaims).toEqual([
      {
        text: "Claim C",
        providerIds: ["gemini"]
      }
    ]);
    expect(result.finalAnswer).toEqual({
      answer: "Claim A",
      whyItWon: "Supported by claude and codex after review.",
      disagreements: ["Claim C (gemini)"],
      openQuestions: []
    });
  });
});
