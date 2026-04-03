import { describe, expect, it } from "vitest";
import { buildConsensusResult } from "../../../src/domain/models/consensus.js";

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
