import type {
  ProviderExecutionContext,
  ProviderExecutionResult
} from "../../domain/models/provider.js";
import { parseProviderFinding } from "../../domain/value-objects/provider-output.js";
import { ProcessRunner } from "../../infrastructure/process/process-runner.js";
import { AbstractProvider } from "../core/abstract-provider.js";
import { buildCrossReviewPrompt } from "../prompts/cross-review-round.js";
import { buildIndependentRoundPrompt } from "../prompts/independent-round.js";

export class GeminiProvider extends AbstractProvider {
  readonly id = "gemini";
  readonly displayName = "Gemini CLI";
  readonly command: string;

  constructor(
    private readonly runner = new ProcessRunner(),
    command = "gemini"
  ) {
    super();
    this.command = command;
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerFindings?.length
      ? buildCrossReviewPrompt(context.topic, context.peerFindings)
      : buildIndependentRoundPrompt(context.topic);
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    return this.runner.run(this.command, ["-p"], this.buildPrompt(context), context.workspaceDir);
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return parseProviderFinding(rawOutput, this.id, this.displayName);
  }
}
