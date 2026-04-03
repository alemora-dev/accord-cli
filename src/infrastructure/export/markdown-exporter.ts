import type {
  ConsensusResult,
  FinalAnswerResult
} from "../../domain/models/consensus.js";

export function exportMarkdownReport(result: ConsensusResult): string {
  const lines = [
    `# ${result.topic}`,
    ""
  ];

  lines.push(
    "## Final answer",
    result.finalAnswer.answer,
    "",
    "## Why this won",
    result.finalAnswer.whyItWon,
    "",
    "## Disagreements",
    ...(result.finalAnswer.disagreements.length > 0
      ? result.finalAnswer.disagreements.map((claim) => `- ${claim}`)
      : ["- None"]),
    "",
    "## Open questions",
    ...(result.finalAnswer.openQuestions.length > 0
      ? result.finalAnswer.openQuestions.map((question) => `- ${question}`)
      : ["- None"]),
    ""
  );

  lines.push(
    "## Consensus",
    ...result.consensusClaims.map((claim) => {
      const providerIds = claim.supportingProviderIds.join(", ");
      return `- ${claim.text} (${providerIds})`;
    }),
    "",
    "## Reported disagreements",
    ...result.contestedClaims.map((claim) => `- ${claim.text} (${claim.providerIds.join(", ")})`)
  );

  return lines.join("\n");
}
