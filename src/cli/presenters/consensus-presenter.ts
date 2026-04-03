export function renderConsensusSummary(input: {
  topic: string;
  claims: string[];
}): string {
  return [`Topic: ${input.topic}`, ...input.claims.map((claim) => `- ${claim}`)].join("\n");
}
