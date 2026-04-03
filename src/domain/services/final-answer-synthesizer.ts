import type {
  ConsensusClaim,
  ContestedClaim,
  FinalAnswerResult
} from "../models/consensus.js";

export class FinalAnswerSynthesizer {
  build(input: {
    topic: string;
    consensusClaims: ConsensusClaim[];
    contestedClaims: ContestedClaim[];
  }): FinalAnswerResult {
    const winningClaim = input.consensusClaims[0];

    return {
      answer: winningClaim?.text ?? "No clear consensus was reached.",
      whyItWon: winningClaim
        ? `Supported by ${winningClaim.supportingProviderIds.join(" and ")} after review.`
        : "No claim had enough support after review.",
      disagreements: input.contestedClaims.map(
        (claim) => `${claim.text} (${claim.providerIds.join(", ")})`
      ),
      openQuestions: []
    };
  }
}
