import { describe, expect, it } from "vitest";
import { ConsensusEngine } from "../../../src/domain/services/consensus-engine.js";

describe("ConsensusEngine", () => {
  it("chooses a canonical display text for equivalent casing and whitespace", () => {
    const result = new ConsensusEngine().build("Topic", [
      {
        providerId: "codex",
        claims: [{ id: "c1", text: "  claim a  ", support: "evidence-backed" }]
      },
      {
        providerId: "claude",
        claims: [{ id: "c2", text: "Claim A", support: "evidence-backed" }]
      }
    ]);

    expect(result.consensusClaims).toEqual([
      {
        text: "Claim A",
        strongestSupport: "evidence-backed",
        supportingProviderIds: ["claude", "codex"]
      }
    ]);
  });

  it("filters low-quality repeats and ranks stronger support first", () => {
    const result = new ConsensusEngine().build("Topic", [
      {
        providerId: "zed",
        claims: [{ id: "c1", text: "Claim A", support: "inference" }]
      },
      {
        providerId: "claude",
        claims: [{ id: "c2", text: "Claim A", support: "unsupported" }]
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
      }
    ]);
    expect(result.contestedClaims).toEqual([
      {
        text: "Claim A",
        providerIds: ["claude", "zed"]
      },
      {
        text: "Claim C",
        providerIds: ["codex", "gemini"]
      }
    ]);
    expect(result.finalAnswer).toEqual({
      answer: "Claim B",
      whyItWon: "Supported by codex and gemini after review.",
      disagreements: ["Claim A (claude, zed)", "Claim C (codex, gemini)"],
      openQuestions: []
    });
  });
});
