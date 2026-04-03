import { describe, expect, it } from "vitest";
import { ConsensusEngine } from "../../../src/domain/services/consensus-engine.js";

describe("ConsensusEngine", () => {
  it("filters low-quality repeats and ranks stronger support first", () => {
    const result = new ConsensusEngine().build("Topic", [
      {
        providerId: "zed",
        claims: [{ id: "c1", text: "Claim A", support: "inference" }]
      },
      {
        providerId: "claude",
        claims: [{ id: "c2", text: "Claim A", support: "inference" }]
      },
      {
        providerId: "codex",
        claims: [{ id: "c3", text: "Claim B", support: "evidence-backed" }]
      },
      {
        providerId: "gemini",
        claims: [{ id: "c4", text: "Claim B", support: "evidence-backed" }]
      },
      {
        providerId: "codex",
        claims: [{ id: "c5", text: "Claim C", support: "unsupported" }]
      },
      {
        providerId: "gemini",
        claims: [{ id: "c6", text: "Claim C", support: "unsupported" }]
      }
    ]);

    expect(result.consensusClaims).toEqual([
      {
        text: "Claim B",
        strongestSupport: "evidence-backed",
        supportingProviderIds: ["codex", "gemini"]
      },
      {
        text: "Claim A",
        strongestSupport: "inference",
        supportingProviderIds: ["claude", "zed"]
      }
    ]);
    expect(result.contestedClaims).toEqual([
      {
        text: "Claim C",
        providerIds: ["codex", "gemini"]
      }
    ]);
    expect(result.finalAnswer).toEqual({
      answer: "Claim B",
      whyItWon: "Supported by codex and gemini after review.",
      disagreements: ["Claim C (codex, gemini)"],
      openQuestions: []
    });
  });
});
