import type { DebateRun, DebateRound } from "../models/debate.js";
import type { ConsensusResult } from "../models/consensus.js";
import type { ProviderFinding } from "../value-objects/provider-output.js";
import type { AbstractProvider } from "../../providers/core/abstract-provider.js";
import { ConsensusEngine } from "./consensus-engine.js";

export interface DebateOrchestrationResult extends DebateRun {
  consensus: ConsensusResult;
}

export class DebateOrchestrator {
  constructor(private readonly consensusEngine = new ConsensusEngine()) {}

  async run(topic: string, providers: AbstractProvider[]): Promise<DebateOrchestrationResult> {
    const workspaceDir = process.cwd();
    const rounds: DebateRound[] = [];
    const independentRound = this.startRound("r1", "independent");
    const independentFindings: ProviderFinding[] = [];

    for (const provider of providers) {
      const rawOutput = await provider.execute({ topic, workspaceDir });
      independentFindings.push(this.parseFinding(provider.id, rawOutput));
    }
    rounds.push(this.completeRound(independentRound));

    const reviewRound = this.startRound("r2", "cross-review");
    const reviewedFindings: ProviderFinding[] = [];

    for (const [index, provider] of providers.entries()) {
      const peerOutputs = independentFindings
        .filter((_, findingIndex) => findingIndex !== index)
        .map((finding) => JSON.stringify(finding));
      const rawOutput = await provider.execute({
        topic,
        workspaceDir,
        peerOutputs
      });
      reviewedFindings.push(this.parseFinding(provider.id, rawOutput));
    }
    rounds.push(this.completeRound(reviewRound));

    const consensusRound = this.startRound("r3", "consensus");
    const consensus = this.consensusEngine.build(topic, reviewedFindings);
    rounds.push(this.completeRound(consensusRound));

    return {
      topic,
      selectedProviderIds: providers.map((provider) => provider.id),
      rounds,
      findings: reviewedFindings,
      consensus
    };
  }

  private parseFinding(providerId: string, rawOutput: string): ProviderFinding {
    const parsed = JSON.parse(rawOutput) as { claims?: ProviderFinding["claims"] };

    return {
      providerId,
      claims: parsed.claims ?? []
    };
  }

  private startRound(id: string, kind: DebateRound["kind"]): DebateRound {
    return {
      id,
      kind,
      startedAt: new Date().toISOString()
    };
  }

  private completeRound(round: DebateRound): DebateRound {
    return {
      ...round,
      completedAt: new Date().toISOString()
    };
  }
}
