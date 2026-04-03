import { describe, expect, it } from "vitest";
import { CodexProvider } from "../../../src/providers/builtins/codex-provider.js";
import { buildCrossReviewPrompt } from "../../../src/providers/prompts/cross-review-round.js";

function createRunnerDouble() {
  const calls: Array<{ command: string; args: string[]; input: string; cwd?: string }> = [];

  return {
    calls,
    runner: {
      async run(command: string, args: string[], input: string, cwd?: string): Promise<string> {
        calls.push({ command, args, input, cwd });
        return "stubbed output";
      }
    }
  };
}

describe("CodexProvider", () => {
  it("delegates the independent-round prompt through the injected runner", async () => {
    const { calls, runner } = createRunnerDouble();
    const provider = new CodexProvider(runner, "codex-override");
    const context = {
      topic: "Should governments mandate model audits?",
      workspaceDir: "/tmp/accord"
    };

    const result = await provider.execute(context);

    expect(result).toBe("stubbed output");
    expect(calls).toEqual([
      {
        command: "codex-override",
        args: ["exec", "--json"],
        input: provider.buildPrompt(context),
        cwd: "/tmp/accord"
      }
    ]);
    expect(calls[0]?.input).toContain("evidence-first");
    expect(calls[0]?.input).toContain("claims");
    expect(calls[0]?.input).toContain("citations");
  });

  it("delegates the cross-review prompt through the injected runner when peer outputs are present", async () => {
    const { calls, runner } = createRunnerDouble();
    const provider = new CodexProvider(runner);
    const context = {
      topic: "Should governments mandate model audits?",
      workspaceDir: "/tmp/accord",
      peerFindings: [
        {
          providerId: "peer-a",
          claims: [{ id: "peer-a-0", text: "Claim A", support: "evidence-backed" }]
        },
        {
          providerId: "peer-b",
          claims: [{ id: "peer-b-0", text: "Claim B", support: "evidence-backed" }]
        }
      ]
    };

    await provider.execute(context as never);

    expect(calls).toEqual([
      {
        command: "codex",
        args: ["exec", "--json"],
        input: provider.buildPrompt(context as never),
        cwd: "/tmp/accord"
      }
    ]);
    expect(calls[0]?.input).toContain("reviewing peer findings");
    expect(calls[0]?.input).toContain("peer-a");
    expect(calls[0]?.input).toContain("Claim A");
    expect(calls[0]?.input).toContain("Return JSON");
    expect(calls[0]?.input).toContain("claims");
    expect(calls[0]?.input).toContain("evidence");
    expect(calls[0]?.input).toContain("confidence");
  });

  it("normalizes raw output without additional parsing", () => {
    const provider = new CodexProvider();
    const rawOutput = JSON.stringify({
      claims: [{ id: "c-1", text: "Sample claim", support: "evidence-backed" }],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });

    expect(provider.normalize(rawOutput)).toEqual({
      providerId: "codex",
      claims: [{ id: "c-1", text: "Sample claim", support: "evidence-backed" }],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });
  });

  it("rejects malformed raw output with an actionable error", () => {
    const provider = new CodexProvider();
    const rawOutput = JSON.stringify({
      claims: [{ id: "c-1", text: "Sample claim" }]
    });

    expect(() => provider.normalize(rawOutput)).toThrow(
      "Codex returned invalid finding payload"
    );
  });

  it("rejects empty claims with an actionable error", () => {
    const provider = new CodexProvider();
    const rawOutput = JSON.stringify({
      claims: [],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });

    expect(() => provider.normalize(rawOutput)).toThrow(
      "Codex returned invalid finding payload"
    );
  });

  it("renders structured peer findings in the cross-review prompt", () => {
    const prompt = buildCrossReviewPrompt("Topic", [
      {
        providerId: "codex",
        claims: [{ id: "c-1", text: "Claim A", support: "evidence-backed" }],
        evidence: [{ id: "e-1", summary: "Evidence A" }],
        confidence: 0.4
      }
    ] as never);

    expect(prompt).toContain("peer findings");
    expect(prompt).toContain('"providerId":"codex"');
    expect(prompt).toContain('"text":"Claim A"');
    expect(prompt).toContain('"confidence":0.4');
  });
});
