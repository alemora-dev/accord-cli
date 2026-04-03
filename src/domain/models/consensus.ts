import type { ProviderFinding } from "../value-objects/provider-output.js";

export interface ConsensusClaim {
  text: string;
  supportingProviderIds: string[];
}

export interface ContestedClaim {
  text: string;
  providerIds: string[];
}

export interface FinalAnswerResult {
  answer: string;
  whyItWon: string;
  disagreements: string[];
  openQuestions: string[];
}

export interface BaseConsensusResult {
  topic: string;
  consensusClaims: ConsensusClaim[];
  contestedClaims: ContestedClaim[];
}

export interface ConsensusResult extends BaseConsensusResult {
  finalAnswer: FinalAnswerResult;
}

export function buildConsensusResult(input: {
  topic: string;
  findings: ProviderFinding[];
}): BaseConsensusResult {
  const groups = new Map<string, { text: string; providerIds: Set<string> }>();

  for (const finding of input.findings) {
    for (const claim of finding.claims) {
      const key = claim.text.trim().toLowerCase();
      const entry = groups.get(key) ?? {
        text: claim.text,
        providerIds: new Set<string>()
      };
      entry.providerIds.add(finding.providerId);
      groups.set(key, entry);
    }
  }

  const consensusClaims: ConsensusClaim[] = [];
  const contestedClaims: ContestedClaim[] = [];

  for (const { text, providerIds } of groups.values()) {
    const normalizedProviders = [...providerIds].sort((left, right) =>
      left.localeCompare(right)
    );
    if (normalizedProviders.length >= 2) {
      consensusClaims.push({ text, supportingProviderIds: normalizedProviders });
    } else {
      contestedClaims.push({ text, providerIds: normalizedProviders });
    }
  }

  consensusClaims.sort((left, right) => {
    const supportDelta =
      right.supportingProviderIds.length - left.supportingProviderIds.length;
    if (supportDelta !== 0) {
      return supportDelta;
    }

    return left.text.localeCompare(right.text);
  });

  contestedClaims.sort((left, right) => left.text.localeCompare(right.text));

  return {
    topic: input.topic,
    consensusClaims,
    contestedClaims
  };
}
