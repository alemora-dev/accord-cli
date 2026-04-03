import type { ProviderFinding, SupportLevel } from "../value-objects/provider-output.js";

export interface ConsensusClaim {
  text: string;
  supportingProviderIds: string[];
  strongestSupport: SupportLevel;
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

const SUPPORT_LEVEL_SCORE: Record<SupportLevel, number> = {
  "evidence-backed": 3,
  inference: 2,
  speculation: 1,
  unsupported: 0
};

export function getSupportScore(level: SupportLevel): number {
  return SUPPORT_LEVEL_SCORE[level];
}

export function compareProviderIds(left: string, right: string): number {
  return left.localeCompare(right);
}

export function compareConsensusClaims(left: ConsensusClaim, right: ConsensusClaim): number {
  const supportCountDelta =
    right.supportingProviderIds.length - left.supportingProviderIds.length;
  if (supportCountDelta !== 0) {
    return supportCountDelta;
  }

  const supportQualityDelta = getSupportScore(right.strongestSupport) - getSupportScore(left.strongestSupport);
  if (supportQualityDelta !== 0) {
    return supportQualityDelta;
  }

  return left.text.localeCompare(right.text);
}

export function compareContestedClaims(left: ContestedClaim, right: ContestedClaim): number {
  return left.text.localeCompare(right.text);
}

export function buildConsensusResult(input: {
  topic: string;
  findings: ProviderFinding[];
}): BaseConsensusResult {
  const groups = new Map<
    string,
    { text: string; providerIds: Set<string>; strongestSupport: SupportLevel }
  >();

  for (const finding of input.findings) {
    for (const claim of finding.claims) {
      const key = claim.text.trim().toLowerCase();
      const entry = groups.get(key) ?? {
        text: claim.text,
        providerIds: new Set<string>(),
        strongestSupport: claim.support
      };
      entry.providerIds.add(finding.providerId);
      if (getSupportScore(claim.support) > getSupportScore(entry.strongestSupport)) {
        entry.strongestSupport = claim.support;
      }
      groups.set(key, entry);
    }
  }

  const consensusClaims: ConsensusClaim[] = [];
  const contestedClaims: ContestedClaim[] = [];

  for (const { text, providerIds, strongestSupport } of groups.values()) {
    const normalizedProviders = [...providerIds].sort(compareProviderIds);
    if (normalizedProviders.length >= 2 && getSupportScore(strongestSupport) >= 2) {
      consensusClaims.push({
        text,
        supportingProviderIds: normalizedProviders,
        strongestSupport
      });
    } else {
      contestedClaims.push({ text, providerIds: normalizedProviders });
    }
  }

  consensusClaims.sort(compareConsensusClaims);
  contestedClaims.sort(compareContestedClaims);

  return {
    topic: input.topic,
    consensusClaims,
    contestedClaims
  };
}
