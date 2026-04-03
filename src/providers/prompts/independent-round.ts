export function buildIndependentRoundPrompt(topic: string): string {
  return [
    "You are participating in an evidence-first research debate.",
    `Topic: ${topic}`,
    "Return JSON with answer, claims, assumptions, evidence, citations, confidence, open_questions, and labeled inference or speculation."
  ].join("\n");
}
