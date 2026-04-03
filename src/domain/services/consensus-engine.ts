import { buildConsensusResult, type ConsensusResult } from "../models/consensus.js";
import type { ProviderFinding } from "../value-objects/provider-output.js";
import { FinalAnswerSynthesizer } from "./final-answer-synthesizer.js";

export class ConsensusEngine {
  private readonly synthesizer = new FinalAnswerSynthesizer();

  build(topic: string, findings: ProviderFinding[]): ConsensusResult {
    const consensus = buildConsensusResult({ topic, findings });

    return {
      ...consensus,
      finalAnswer: this.synthesizer.build(consensus)
    };
  }
}
