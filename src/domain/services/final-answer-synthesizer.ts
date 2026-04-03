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
    const consensusClaims = [...input.consensusClaims].sort((left, right) => {
      const supportDelta =
        right.supportingProviderIds.length - left.supportingProviderIds.length;
      if (supportDelta !== 0) {
        return supportDelta;
      }

      return left.text.localeCompare(right.text);
    });
    const contestedClaims = [...input.contestedClaims].sort((left, right) =>
      left.text.localeCompare(right.text)
    );
    const winningClaim = consensusClaims[0];
    const supportingProviderIds = winningClaim?.supportingProviderIds
      ? [...winningClaim.supportingProviderIds].sort((left, right) =>
          left.localeCompare(right)
        )
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
