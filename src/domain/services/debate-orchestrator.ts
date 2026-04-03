import type { DebateRun, DebateRound } from "../models/debate.js";
import type { ConsensusResult } from "../models/consensus.js";
import type { ProviderArtifact } from "../value-objects/debate-artifacts.js";
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
    const independentArtifacts: ProviderArtifact[] = [];
    const canReview = providers.length >= 2;

    for (const provider of providers) {
      const rawOutput = await provider.execute({ topic, workspaceDir });
      independentArtifacts.push({
        providerId: provider.id,
        rawOutput,
        normalized: provider.normalize(rawOutput)
      });
    }
    rounds.push(this.completeRound(independentRound));

    const reviewArtifacts: ProviderArtifact[] = [];

    if (canReview) {
      const reviewRound = this.startRound("r2", "cross-review");

      for (const [index, provider] of providers.entries()) {
        const peerOutputs = independentArtifacts
          .filter((_, findingIndex) => findingIndex !== index)
          .map((artifact) => artifact.rawOutput);
        const rawOutput = await provider.execute({
          topic,
          workspaceDir,
          peerOutputs
        });
        reviewArtifacts.push({
          providerId: provider.id,
          rawOutput,
          normalized: provider.normalize(rawOutput)
        });
      }
      rounds.push(this.completeRound(reviewRound));
    }

    const consensusRound = this.startRound("r3", "consensus");
    const independentFindings = independentArtifacts.map((artifact) => artifact.normalized);
    const reviewFindings = reviewArtifacts.map((artifact) => artifact.normalized);
    const finalFindings = reviewFindings.length ? reviewFindings : independentFindings;
    const consensus = this.consensusEngine.build(topic, finalFindings);
    rounds.push(this.completeRound(consensusRound));

    return {
      topic,
      selectedProviderIds: providers.map((provider) => provider.id),
      rounds,
      findings: finalFindings,
      independentArtifacts,
      reviewArtifacts,
      independentFindings,
      reviewFindings,
      consensus
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
