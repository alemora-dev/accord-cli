import type {
  ProviderExecutionContext,
  ProviderExecutionResult
} from "../../domain/models/provider.js";
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
    return { rawOutput };
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
