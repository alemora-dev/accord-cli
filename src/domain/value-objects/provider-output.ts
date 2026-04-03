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
