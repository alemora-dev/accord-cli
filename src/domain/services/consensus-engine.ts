import { buildConsensusResult } from "../models/consensus.js";
import type { ProviderFinding } from "../value-objects/provider-output.js";

export class ConsensusEngine {
  build(topic: string, findings: ProviderFinding[]) {
    return buildConsensusResult({ topic, findings });
  }
}
