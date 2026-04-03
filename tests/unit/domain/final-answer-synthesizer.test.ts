import { describe, expect, it } from "vitest";
import { FinalAnswerSynthesizer } from "../../../src/domain/services/final-answer-synthesizer.js";

describe("FinalAnswerSynthesizer", () => {
  it("builds a deterministic final answer from consensus data", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const result = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [
        {
          text: "The sky is blue.",
          supportingProviderIds: ["codex", "gemini"]
        }
      ],
      contestedClaims: [
        {
          text: "The sky is gray.",
          providerIds: ["claude"]
        }
      ]
    });

    expect(result).toEqual({
      answer: "The sky is blue.",
      whyItWon: "Supported by codex and gemini after review.",
      disagreements: ["The sky is gray. (claude)"],
      openQuestions: []
    });
  });
});
