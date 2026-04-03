import { describe, expect, it } from "vitest";
import { DebateOrchestrator } from "../../../src/domain/services/debate-orchestrator.js";
import { FakeProvider } from "../../../src/testing/fakes/fake-provider.js";

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
        supportingProviderIds: ["codex", "claude"]
      }
    ]);
    expect(result.findings.map((finding) => finding.claims[0]?.text)).toEqual([
      "Shared claim",
      "Shared claim",
      "Different review claim"
    ]);
    expect(codex.executionContexts).toHaveLength(2);
    expect(codex.executionContexts[1]?.peerOutputs).toEqual([
      JSON.stringify({
        answer: "claude answer",
        claims: [{ id: "claude-0", text: "Claim B", support: "evidence-backed" }]
      }),
      JSON.stringify({
        answer: "gemini answer",
        claims: [{ id: "gemini-0", text: "Claim C", support: "evidence-backed" }]
      })
    ]);
  });

  it("returns independent and review findings separately", async () => {
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
