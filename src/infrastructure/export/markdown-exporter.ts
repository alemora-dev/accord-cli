import type { ConsensusResult } from "../../domain/models/consensus.js";

export function exportMarkdownReport(result: ConsensusResult): string {
  return [
    `# ${result.topic}`,
    "",
    "## Consensus",
    ...result.consensusClaims.map(
      (claim) => `- ${claim.text} (${claim.supportingProviderIds.join(", ")})`
    ),
    "",
    "## Disagreements",
    ...result.contestedClaims.map((claim) => `- ${claim.text} (${claim.providerIds.join(", ")})`)
  ].join("\n");
}
