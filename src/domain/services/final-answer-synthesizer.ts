import type {
  ConsensusClaim,
  ContestedClaim,
  FinalAnswerResult
} from "../models/consensus.js";
import {
  compareConsensusClaims,
  compareContestedClaims,
  compareProviderIds
} from "../models/consensus.js";

export class FinalAnswerSynthesizer {
  build(input: {
    topic: string;
    consensusClaims: ConsensusClaim[];
    contestedClaims: ContestedClaim[];
  }): FinalAnswerResult {
    const consensusClaims = [...input.consensusClaims].sort(compareConsensusClaims);
    const contestedClaims = [...input.contestedClaims].sort(compareContestedClaims);
    const winningClaim = consensusClaims[0];
    const supportingProviderIds = winningClaim?.supportingProviderIds
      ? [...winningClaim.supportingProviderIds].sort(compareProviderIds)
      : [];

    return {
      answer: winningClaim?.text ?? "No clear consensus was reached.",
      whyItWon: winningClaim
        ? `Supported by ${supportingProviderIds.join(" and ")} after review.`
        : "No claim had enough support after review.",
      disagreements: contestedClaims.map(
        (claim) => `${claim.text} (${claim.providerIds.join(", ")})`
      ),
      openQuestions: []
    };
  }
}
