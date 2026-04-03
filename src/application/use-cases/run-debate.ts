import type { AbstractProvider } from "../../providers/core/abstract-provider.js";
import { DebateOrchestrator } from "../../domain/services/debate-orchestrator.js";

export async function runDebate(input: {
  topic: string;
  providers: AbstractProvider[];
}) {
  const orchestrator = new DebateOrchestrator();

  return orchestrator.run(input.topic, input.providers);
}
