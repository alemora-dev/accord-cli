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

export interface ConsensusResult {
  topic: string;
  consensusClaims: ConsensusClaim[];
  contestedClaims: ContestedClaim[];
  finalAnswer?: FinalAnswerResult;
}

export function buildConsensusResult(input: {
  topic: string;
  findings: ProviderFinding[];
}): ConsensusResult {
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
    const normalizedProviders = [...providerIds];
    if (normalizedProviders.length >= 2) {
      consensusClaims.push({ text, supportingProviderIds: normalizedProviders });
    } else {
      contestedClaims.push({ text, providerIds: normalizedProviders });
    }
  }

  return {
    topic: input.topic,
    consensusClaims,
    contestedClaims
  };
}
