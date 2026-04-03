import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { estimateRunCost } from "../../src/application/services/cost-estimator.js";
import { resumeSession } from "../../src/application/use-cases/resume-session.js";
import { setupProviders } from "../../src/application/use-cases/setup-providers.js";
import { buildProgram } from "../../src/cli/entry.js";
import { startSessionRepl } from "../../src/cli/repl/session-repl.js";
import type { DebateOrchestrationResult } from "../../src/domain/services/debate-orchestrator.js";
import { SessionRepository } from "../../src/infrastructure/fs/session-repository.js";
import { FakeProvider } from "../../src/testing/fakes/fake-provider.js";

describe("buildProgram", () => {
  it("registers the interactive default command and setup helpers", () => {
    const program = buildProgram();
    const commandNames = program.commands.map((command: { name(): string }) => command.name());

    expect(commandNames).toContain("setup");
    expect(commandNames).toContain("sessions");
    expect(commandNames).toContain("resume");
    expect(commandNames).toContain("export");
  });
});

describe("estimateRunCost", () => {
  it("returns a lightweight usage summary before launch", () => {
    const estimate = estimateRunCost({
      providerIds: ["codex", "claude"],
      rounds: 2,
      expectedPromptChars: 2400
    });

    expect(estimate.riskLevel).toBe("medium");
    expect(estimate.summary).toContain("codex");
    expect(estimate.summary).toContain("claude");
  });
});

describe("setupProviders", () => {
  it("builds a presentable setup summary model from detection results", () => {
    const summary = setupProviders({
      detectionResults: [
        { id: "codex", command: "codex", detected: true },
        { id: "claude", command: "claude", detected: false }
      ]
    });

    expect(summary.providers).toEqual([
      { id: "codex", command: "codex", status: "detected" },
      { id: "claude", command: "claude", status: "unavailable" }
    ]);
    expect(summary.detectedCount).toBe(1);
    expect(summary.canLaunch).toBe(true);
  });
});

describe("resumeSession", () => {
  it("loads a stored session by id from the repository boundary", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "accord-resume-"));
    const repository = new SessionRepository(tempDir);

    await repository.save({
      id: "session-1",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
      title: "Stored session"
    });

    const result = await resumeSession({ sessionId: "session-1", repository });

    expect(result.status).toBe("loaded");
    expect(result.session?.title).toBe("Stored session");
  });

  it("returns an invalid status without touching the repository for a bad id", async () => {
    const repository = {
      get: vi.fn(async () => {
        throw new Error("should not be called");
      })
    };

    const result = await resumeSession({ sessionId: "../x", repository });

    expect(result).toEqual({
      sessionId: "../x",
      status: "invalid",
      reason: "invalid_session_id",
      session: null
    });
    expect(repository.get).not.toHaveBeenCalled();
  });
});

describe("startSessionRepl", () => {
  it("shows the estimate and exits cleanly when the user declines the cost gate", async () => {
    const note = vi.fn();
    const cancel = vi.fn();

    await startSessionRepl({
      promptForTopic: async () => "A focused topic",
      confirmLaunch: async () => false,
      note,
      cancel
    });

    expect(note).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith("Session cancelled before launch.");
  });

  it("uses the provided launch context when estimating run cost", async () => {
    const note = vi.fn();
    const cancel = vi.fn();

    await startSessionRepl({
      launchContext: {
        providerIds: ["alpha", "beta"],
        rounds: 5
      },
      promptForTopic: async () => "A focused topic",
      confirmLaunch: async () => false,
      note,
      cancel
    });

    expect(note).toHaveBeenCalledOnce();
    expect(note.mock.calls[0]?.[0]).toContain("alpha");
    expect(note.mock.calls[0]?.[0]).toContain("beta");
    expect(note.mock.calls[0]?.[0]).not.toContain("codex");
    expect(note.mock.calls[0]?.[0]).not.toContain("claude");
  });

  it("launches the debate runner with the selected providers after confirmation", async () => {
    const note = vi.fn();
    const cancel = vi.fn();
    const runDebateMock = vi.fn(
      async (input: { topic: string; providers: Array<{ id: string }> }): Promise<DebateOrchestrationResult> => ({
      topic: input.topic,
      selectedProviderIds: input.providers.map((provider) => provider.id),
      rounds: [],
      findings: [],
      independentFindings: [],
      reviewFindings: [],
      independentArtifacts: [],
      reviewArtifacts: [],
      consensus: {
        topic: input.topic,
        consensusClaims: [],
        contestedClaims: [],
        finalAnswer: {
          answer: "Shared claim",
          whyItWon: "Supported by codex and gemini after review.",
          disagreements: [],
          openQuestions: []
        }
      }
      })
    );
    const codex = new FakeProvider("codex", ["Claim A"], ["Shared claim"]);
    const gemini = new FakeProvider("gemini", ["Claim B"], ["Shared claim"]);
    const claude = new FakeProvider("claude", ["Claim C"], ["Shared claim"]);

    await startSessionRepl({
      launchContext: {
        providerIds: ["codex", "gemini"],
        rounds: 2
      },
      providers: [codex, gemini, claude],
      promptForTopic: async () => "A focused topic",
      confirmLaunch: async () => true,
      note,
      cancel,
      runDebate: runDebateMock
    });

    expect(runDebateMock).toHaveBeenCalledOnce();
    expect(runDebateMock.mock.calls[0]?.[0].providers.map((provider: { id: string }) => provider.id)).toEqual([
      "codex",
      "gemini"
    ]);
    expect(note.mock.calls.at(-1)?.[0]).toContain("Final answer: Shared claim");
    expect(cancel).not.toHaveBeenCalled();
  });
});
