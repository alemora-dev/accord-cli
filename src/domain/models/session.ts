import type { DebateRun } from "./debate.js";

export interface SessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  run?: DebateRun;
}
