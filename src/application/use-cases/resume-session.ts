import type { SessionRecord } from "../../domain/models/session.js";

export interface SessionLookupRepository {
  get(sessionId: string): Promise<SessionRecord | null>;
}

export type ResumeSessionResult =
  | {
      sessionId: string;
      status: "invalid";
      reason: "invalid_session_id";
      session: null;
    }
  | {
      sessionId: string;
      status: "not_found";
      session: null;
    }
  | {
      sessionId: string;
      status: "loaded";
      session: SessionRecord;
    };

export async function resumeSession(input: {
  sessionId: string;
  repository: SessionLookupRepository;
}): Promise<ResumeSessionResult> {
  const sessionId = input.sessionId.trim();

  if (!isValidSessionId(sessionId)) {
    return {
      sessionId,
      status: "invalid",
      reason: "invalid_session_id",
      session: null
    };
  }

  const session = await input.repository.get(sessionId);

  if (session === null) {
    return {
      sessionId,
      status: "not_found",
      session: null
    };
  }

  return {
    sessionId,
    status: "loaded",
    session
  };
}

function isValidSessionId(sessionId: string): boolean {
  if (sessionId === "") {
    return false;
  }

  if (sessionId.includes("/") || sessionId.includes("\\")) {
    return false;
  }

  return !sessionId.split(/[\\/]/).some((segment) => segment === ".." || segment === "");
}
