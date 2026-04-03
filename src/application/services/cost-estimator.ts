export function estimateRunCost(input: {
  providerIds: string[];
  rounds: number;
  expectedPromptChars: number;
}): {
  riskLevel: "low" | "medium" | "high";
  summary: string;
} {
  const volume = input.providerIds.length * input.rounds * input.expectedPromptChars;
  const riskLevel: "low" | "medium" | "high" =
    volume > 12_000 ? "high" : volume > 3_000 ? "medium" : "low";

  return {
    riskLevel,
    summary: `${input.providerIds.join(", ")} across ${input.rounds} rounds`
  };
}
