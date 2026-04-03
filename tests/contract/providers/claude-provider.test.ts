import { describe, expect, it } from "vitest";
import { ClaudeProvider } from "../../../src/providers/builtins/claude-provider.js";

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

describe("ClaudeProvider", () => {
  it("delegates the independent-round prompt through the injected runner", async () => {
    const { calls, runner } = createRunnerDouble();
    const provider = new ClaudeProvider(runner, "claude-override");
    const context = {
      topic: "Should governments mandate model audits?",
      workspaceDir: "/tmp/accord"
    };

    const result = await provider.execute(context);

    expect(result).toBe("stubbed output");
    expect(calls).toEqual([
      {
        command: "claude-override",
        args: ["-p"],
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
    const provider = new ClaudeProvider(runner);
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

    await provider.execute(context);

    expect(calls).toEqual([
      {
        command: "claude",
        args: ["-p"],
        input: provider.buildPrompt(context),
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
    const provider = new ClaudeProvider();
    const rawOutput = JSON.stringify({
      claims: [{ id: "c-1", text: "Sample claim", support: "evidence-backed" }],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });

    expect(provider.normalize(rawOutput)).toEqual({
      providerId: "claude",
      claims: [{ id: "c-1", text: "Sample claim", support: "evidence-backed" }],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });
  });

  it("rejects malformed raw output with an actionable error", () => {
    const provider = new ClaudeProvider();
    const rawOutput = JSON.stringify({
      claims: [{ id: "c-1", text: "Sample claim" }]
    });

    expect(() => provider.normalize(rawOutput)).toThrow(
      "Claude Code returned invalid finding payload"
    );
  });

  it("rejects empty claims with an actionable error", () => {
    const provider = new ClaudeProvider();
    const rawOutput = JSON.stringify({
      claims: [],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: 0.75
    });

    expect(() => provider.normalize(rawOutput)).toThrow(
      "Claude Code returned invalid finding payload"
    );
  });

  it("rejects confidence outside the normalized range", () => {
    const provider = new ClaudeProvider();
    const rawOutput = JSON.stringify({
      claims: [{ id: "c-1", text: "Sample claim", support: "evidence-backed" }],
      evidence: [{ id: "e-1", summary: "Sample evidence" }],
      confidence: -0.1
    });

    expect(() => provider.normalize(rawOutput)).toThrow(
      "Claude Code returned invalid finding payload"
    );
  });
});
