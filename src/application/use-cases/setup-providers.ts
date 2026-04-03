import type { ProviderDetectionResult } from "../../domain/models/provider.js";

export interface SetupProviderSummary {
  id: string;
  command: string;
  status: "detected" | "unavailable";
}

export interface SetupProvidersResult {
  providers: SetupProviderSummary[];
  detectedCount: number;
  unavailableCount: number;
  canLaunch: boolean;
}

export function setupProviders(input: {
  detectionResults: ProviderDetectionResult[];
}): SetupProvidersResult {
  const providers: SetupProviderSummary[] = input.detectionResults.map((result) => ({
    id: result.id,
    command: result.command,
    status: result.detected ? "detected" : "unavailable"
  }));

  const detectedCount = providers.filter((provider) => provider.status === "detected").length;

  return {
    providers,
    detectedCount,
    unavailableCount: providers.length - detectedCount,
    canLaunch: detectedCount > 0
  };
}

export async function runProviderSetup(input: {
  providers: Array<{ id: string; command: string }>;
  detectAvailableProviders: (
    providers: Array<{ id: string; command: string }>
  ) => Promise<ProviderDetectionResult[]>;
}): Promise<SetupProvidersResult> {
  const detectionResults = await input.detectAvailableProviders(input.providers);

  return setupProviders({ detectionResults });
}
