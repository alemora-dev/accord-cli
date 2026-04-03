import { describe, expect, it } from "vitest";
import { FinalAnswerSynthesizer } from "../../../src/domain/services/final-answer-synthesizer.js";

describe("FinalAnswerSynthesizer", () => {
  it("builds the same final answer for equivalent inputs in different orders", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const resultA = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [
        {
          text: "The sky is alpha.",
          strongestSupport: "inference",
          supportingProviderIds: ["codex", "gemini"]
        },
        {
          text: "The sky is zulu.",
          strongestSupport: "evidence-backed",
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
          text: "The sky is zulu.",
          strongestSupport: "evidence-backed",
          supportingProviderIds: ["gemini", "codex"]
        },
        {
          text: "The sky is alpha.",
          strongestSupport: "inference",
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
      answer: "The sky is zulu.",
      whyItWon: "Supported by codex and gemini after review.",
      disagreements: ["The sky is gray. (claude)"],
      openQuestions: []
    });
    expect(resultB).toEqual(resultA);
  });

  it("sorts provider ids inside disagreement strings", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const result = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [],
      contestedClaims: [
        {
          text: "The sky is gray.",
          providerIds: ["gemini", "claude"]
        }
      ]
    });

    expect(result.disagreements).toEqual(["The sky is gray. (claude, gemini)"]);
  });

  it("falls back cleanly when no consensus claims clear the threshold", () => {
    const synthesizer = new FinalAnswerSynthesizer();

    const result = synthesizer.build({
      topic: "What color is the sky?",
      consensusClaims: [],
      contestedClaims: [
        {
          text: "The sky is gray.",
          providerIds: ["claude", "gemini"]
        }
      ]
    });

    expect(result).toEqual({
      answer: "No clear consensus was reached.",
      whyItWon: "No claim had enough support after review.",
      disagreements: ["The sky is gray. (claude, gemini)"],
      openQuestions: []
    });
  });
});
