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

export interface ProviderExecutionResult {
  rawOutput: string;
}
