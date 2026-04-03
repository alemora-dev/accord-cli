import type {
  ProviderExecutionContext,
  ProviderExecutionResult
} from "../../domain/models/provider.js";
import { ProcessRunner } from "../../infrastructure/process/process-runner.js";
import { AbstractProvider } from "../core/abstract-provider.js";
import { buildCrossReviewPrompt } from "../prompts/cross-review-round.js";
import { buildIndependentRoundPrompt } from "../prompts/independent-round.js";

export class CodexProvider extends AbstractProvider {
  readonly id = "codex";
  readonly displayName = "Codex";
  readonly command: string;

  constructor(
    private readonly runner = new ProcessRunner(),
    command = "codex"
  ) {
    super();
    this.command = command;
  }

  buildPrompt(context: ProviderExecutionContext): string {
    return context.peerOutputs?.length
      ? buildCrossReviewPrompt(context.topic, context.peerOutputs)
      : buildIndependentRoundPrompt(context.topic);
  }

  async execute(context: ProviderExecutionContext): Promise<string> {
    return this.runner.run(
      this.command,
      ["exec", "--json"],
      this.buildPrompt(context),
      context.workspaceDir
    );
  }

  normalize(rawOutput: string): ProviderExecutionResult {
    return { rawOutput };
  }
}
