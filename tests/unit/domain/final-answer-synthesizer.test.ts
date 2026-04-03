import { describe, expect, it } from "vitest";
import { FinalAnswerSynthesizer } from "../../../src/domain/services/final-answer-synthesizer.js";

describe("FinalAnswerSynthesizer", () => {
  it("builds the same final answer for equivalent inputs in different orders", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const resultA = synthesizer.build({
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

    const resultB = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [
        {
          text: "The sky is blue.",
          supportingProviderIds: ["gemini", "codex"]
        }
      ],
      contestedClaims: [
        {
          text: "The sky is gray.",
          providerIds: ["claude"]
        }
      ]
    });

    expect(resultA).toEqual({
      answer: "The sky is blue.",
      whyItWon: "Supported by codex and gemini after review.",
      disagreements: ["The sky is gray. (claude)"],
      openQuestions: []
    });
    expect(resultB).toEqual(resultA);
  });
});
