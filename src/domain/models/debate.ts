import type { ProviderFinding } from "../value-objects/provider-output.js";
import type { DebateArtifacts } from "../value-objects/debate-artifacts.js";

export interface DebateRound {
  id: string;
  kind: "independent" | "cross-review" | "consensus";
  startedAt: string;
  completedAt?: string;
}

export interface DebateRun extends DebateArtifacts {
  topic: string;
  selectedProviderIds: string[];
  rounds: DebateRound[];
  findings: ProviderFinding[];
  independentFindings: ProviderFinding[];
  reviewFindings: ProviderFinding[];
}
