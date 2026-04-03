import type { ProviderDetectionResult } from "../../domain/models/provider.js";

export async function detectProviders(
  providers: Array<{ id: string; command: string }>,
  hasCommand: (command: string) => Promise<boolean>
): Promise<ProviderDetectionResult[]> {
  const results: ProviderDetectionResult[] = [];

  for (const provider of providers) {
    results.push({
      id: provider.id,
      command: provider.command,
      detected: await hasCommand(provider.command)
    });
  }

  return results;
}
