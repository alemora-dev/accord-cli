import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SessionRepository } from "../../../src/infrastructure/fs/session-repository.js";

describe("SessionRepository", () => {
  it("writes and reads a saved session", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "accord-session-repository-"));

    try {
      const repository = new SessionRepository(tempDir);

      await repository.save({
        id: "session-1",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:00.000Z",
        title: "AI regulation debate"
      });

      const session = await repository.get("session-1");

      expect(session?.title).toBe("AI regulation debate");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects invalid session ids", async () => {
    const repository = new SessionRepository("/tmp/accord-test");

    await expect(
      repository.save({
        id: "../escape",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:00.000Z",
        title: "AI regulation debate"
      })
    ).rejects.toThrow("Invalid session id");
  });

  it("rethrows non-missing-file errors from get", async () => {
    const repository = new SessionRepository("/tmp/accord-test");
    const error = Object.assign(new Error("permission denied"), { code: "EACCES" });
    const readFileSpy = vi.spyOn(fs, "readFile").mockRejectedValueOnce(error);

    await expect(repository.get("session-1")).rejects.toThrow("permission denied");

    readFileSpy.mockRestore();
  });
});
