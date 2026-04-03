import * as prompts from "@clack/prompts";
import { estimateRunCost } from "../../application/services/cost-estimator.js";
import type { AbstractProvider } from "../../providers/core/abstract-provider.js";
import { runDebate as defaultRunDebate } from "../../application/use-cases/run-debate.js";
import { confirmDebateLaunch, promptForDebateTopic } from "../prompts/debate-prompts.js";
import { renderSessionPlan } from "../presenters/session-presenter.js";

const DEFAULT_PROVIDER_IDS = ["codex", "claude"];
const FIXED_DEBATE_ROUNDS = 2;

export interface SessionLaunchContext {
  providerIds: string[];
}

export async function startSessionRepl(input?: {
  launchContext?: SessionLaunchContext;
  providers?: AbstractProvider[];
  promptForTopic?: () => Promise<string | null>;
  confirmLaunch?: (estimate: ReturnType<typeof estimateRunCost>) => Promise<boolean>;
  runDebate?: typeof defaultRunDebate;
  note?: (message: string, title: string) => void;
  cancel?: (message: string) => void;
}): Promise<void> {
  const launchContext = input?.launchContext ?? {
    providerIds: DEFAULT_PROVIDER_IDS
  };
  const providers = input?.providers ?? [];
  const promptForTopic = input?.promptForTopic ?? promptForDebateTopic;
  const confirmLaunch =
    input?.confirmLaunch ??
    (async (estimate: ReturnType<typeof estimateRunCost>) =>
      await confirmDebateLaunch({ riskLevel: estimate.riskLevel }));
  const runDebate = input?.runDebate ?? defaultRunDebate;
  const note = input?.note ?? prompts.note;
  const cancel = input?.cancel ?? prompts.cancel;
  const topic = await promptForTopic();

  if (topic === null) {
    return;
  }

  const estimate = estimateRunCost({
    providerIds: launchContext.providerIds,
    rounds: FIXED_DEBATE_ROUNDS,
    expectedPromptChars: topic.length * 20
  });

  note(
    renderSessionPlan({
      topic,
      riskLevel: estimate.riskLevel,
      summary: estimate.summary
    }),
    "Execution plan"
  );

  if (!(await confirmLaunch(estimate))) {
    cancel("Session cancelled before launch.");
    return;
  }

  const selectedProviders = providers.filter((provider) => launchContext.providerIds.includes(provider.id));

  if (!selectedProviders.length) {
    cancel("No configured providers were selected for launch.");
    return;
  }

  const result = await runDebate({
    topic,
    providers: selectedProviders
  });

  note(`Final answer: ${result.consensus.finalAnswer.answer}`, "Debate result");
}
