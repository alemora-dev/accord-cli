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
      peerOutputs: ["peer output A", "peer output B"]
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
    expect(calls[0]?.input).toContain("reviewing peer outputs");
    expect(calls[0]?.input).toContain("peer output A");
    expect(calls[0]?.input).toContain("peer output B");
  });

  it("normalizes raw output without additional parsing", () => {
    const provider = new ClaudeProvider();
    const rawOutput = "{\"answer\":\"Sample answer\"}";

    expect(provider.normalize(rawOutput)).toEqual({ rawOutput });
  });
});
