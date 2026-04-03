import type {
  ProviderExecutionContext,
  ProviderExecutionResult
} from "../../domain/models/provider.js";

export abstract class AbstractProvider {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly command: string;

  abstract buildPrompt(context: ProviderExecutionContext): string;
  abstract execute(context: ProviderExecutionContext): Promise<string>;

  abstract normalize(rawOutput: string): ProviderExecutionResult;
}
