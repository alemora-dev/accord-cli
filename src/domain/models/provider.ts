import type { ProviderFinding } from "../value-objects/provider-output.js";

export interface ProviderDetectionResult {
  id: string;
  command: string;
  detected: boolean;
}

export interface ProviderExecutionContext {
  topic: string;
  workspaceDir: string;
  peerOutputs?: string[];
}

export interface ProviderExecutionResult extends ProviderFinding {}
