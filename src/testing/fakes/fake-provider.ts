import type {
  ProviderExecutionContext,
  ProviderExecutionResult
} from "../../domain/models/provider.js";
import type { ProviderFindingPayload } from "../../domain/value-objects/provider-output.js";
import { AbstractProvider } from "../../providers/core/abstract-provider.js";

export class FakeProvider extends AbstractProvider {
  readonly displayName: string;
  readonly command: string;
  readonly executionContexts: ProviderExecutionContext[] = [];

  constructor(
    readonly id: string,
    private readonly independentClaims: string[],
    private readonly reviewClaims: string[]
  ) {
    super();
    this.displayName = id;
    this.command = id;
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length ? "cross-review" : "independent";
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    const parsed = JSON.parse(rawOutput) as ProviderFindingPayload;

    return {
      providerId: this.id,
      claims: parsed.claims ?? [],
      evidence: parsed.evidence,
      confidence: parsed.confidence
    };
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    this.executionContexts.push({
      topic: context.topic,
      workspaceDir: context.workspaceDir,
      peerOutputs: context.peerOutputs ? [...context.peerOutputs] : undefined
    });

    const claims = context.peerOutputs?.length ? this.reviewClaims : this.independentClaims;

    return JSON.stringify({
      answer: `${this.id} answer`,
      claims: claims.map((text, index) => ({
        id: `${this.id}-${index}`,
        text,
        support: "evidence-backed"
      }))
    });
  }
}
