export function renderSessionPlan(input: {
  topic: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
}): string {
  return [`Topic: ${input.topic}`, `Launch risk: ${input.riskLevel}`, input.summary].join("\n");
}
