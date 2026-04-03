export function buildCrossReviewPrompt(topic: string, peerOutputs: string[]): string {
  return [
    `You are reviewing peer outputs for the topic: ${topic}`,
    "Identify agreement, disputed claims, missing evidence, weak support, and your revised final position.",
    "Peer outputs:",
    ...peerOutputs
  ].join("\n");
}
