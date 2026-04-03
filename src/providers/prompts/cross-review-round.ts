export function buildCrossReviewPrompt(topic: string, peerOutputs: string[]): string {
  return [
    `You are reviewing peer outputs for the topic: ${topic}`,
    "Identify agreement, disputed claims, missing evidence, weak support, and your revised final position.",
    "Return JSON with answer, claims, evidence, citations, confidence, open_questions, and labeled inference or speculation.",
    "Peer outputs:",
    ...peerOutputs
  ].join("\n");
}
