import { describe, expect, it } from "vitest";
import { CodexProvider } from "../../../src/providers/builtins/codex-provider.js";

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
      peerOutputs: ["peer output A", "peer output B"]
    };

    await provider.execute(context);

    expect(calls).toEqual([
      {
        command: "codex",
        args: ["exec", "--json"],
        input: provider.buildPrompt(context),
        cwd: "/tmp/accord"
      }
    ]);
    expect(calls[0]?.input).toContain("reviewing peer outputs");
    expect(calls[0]?.input).toContain("peer output A");
    expect(calls[0]?.input).toContain("peer output B");
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
});
