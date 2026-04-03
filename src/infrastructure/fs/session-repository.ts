import fs from "node:fs/promises";
import path from "node:path";
import type { SessionRecord } from "../../domain/models/session.js";

export class SessionRepository {
  constructor(private readonly rootDir: string) {}

  async save(session: SessionRecord): Promise<void> {
    assertValidSessionId(session.id);
    const sessionDir = path.join(this.rootDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(sessionDir, "session.json"),
      JSON.stringify(session, null, 2),
      "utf8"
    );
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    assertValidSessionId(sessionId);
    try {
      const file = await fs.readFile(path.join(this.rootDir, sessionId, "session.json"), "utf8");
      return JSON.parse(file) as SessionRecord;
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }

      throw error;
    }
  }
}

function assertValidSessionId(sessionId: string): void {
  if (sessionId.trim() === "") {
    throw new Error("Invalid session id: must not be empty");
  }

  if (sessionId.includes("/") || sessionId.includes("\\") || sessionId.split(/[\\/]/).some((segment) => segment === "" || segment === "..")) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
