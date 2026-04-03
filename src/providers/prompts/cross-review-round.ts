import type { ProviderFinding } from "../../domain/value-objects/provider-output.js";

export function buildCrossReviewPrompt(topic: string, peerFindings: ProviderFinding[]): string {
  return [
    `You are reviewing peer findings for the topic: ${topic}`,
    "Identify agreement, disputed claims, missing evidence, weak support, and your revised final position.",
    "Return JSON with answer, claims, evidence, citations, confidence, open_questions, and labeled inference or speculation.",
    "Peer findings:",
    ...peerFindings.map((finding) => JSON.stringify(finding))
  ].join("\n");
}
