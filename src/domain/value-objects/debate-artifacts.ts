import type { ProviderFinding } from "./provider-output.js";

export interface ProviderArtifact {
  providerId: string;
  rawOutput: string;
  normalized: ProviderFinding;
}

export interface DebateArtifacts {
  independentArtifacts: ProviderArtifact[];
  reviewArtifacts: ProviderArtifact[];
}
