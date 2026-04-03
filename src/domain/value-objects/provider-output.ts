import { z } from "zod";

export type ProviderId = "codex" | "claude" | "gemini" | string;

export type SupportLevel = "evidence-backed" | "inference" | "speculation" | "unsupported";

export interface Claim {
  id: string;
  text: string;
  support: SupportLevel;
  citations?: string[];
}

export interface EvidenceItem {
  id: string;
  summary: string;
  citation?: string;
}

export interface ProviderFinding {
  providerId: ProviderId;
  claims: Claim[];
  evidence?: EvidenceItem[];
  confidence?: number;
}

export interface ProviderFindingPayload {
  claims?: Claim[];
  evidence?: EvidenceItem[];
  confidence?: number;
}

export const ProviderFindingPayloadSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      support: z.enum(["evidence-backed", "inference", "speculation", "unsupported"]),
      citations: z.array(z.string()).optional()
    })
  ).default([]),
  evidence: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string(),
        citation: z.string().optional()
      })
    )
    .optional(),
  confidence: z.number().optional()
});

export function parseProviderFinding(
  rawOutput: string,
  providerId: ProviderId,
  providerName = providerId
): ProviderFinding {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawOutput);
  } catch {
    throw new Error(`${providerName} returned invalid JSON while producing a finding`);
  }

  const result = ProviderFindingPayloadSchema.safeParse(parsedJson);

  if (!result.success) {
    throw new Error(
      `${providerName} returned invalid finding payload: ${result.error.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }

  return {
    providerId,
    claims: result.data.claims,
    evidence: result.data.evidence,
    confidence: result.data.confidence
  };
}
