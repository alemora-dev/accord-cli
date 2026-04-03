import * as prompts from "@clack/prompts";
import { estimateRunCost } from "../../application/services/cost-estimator.js";
import { confirmDebateLaunch, promptForDebateTopic } from "../prompts/debate-prompts.js";
import { renderSessionPlan } from "../presenters/session-presenter.js";

const DEFAULT_PROVIDER_IDS = ["codex", "claude"];
const DEFAULT_ROUNDS = 2;

export interface SessionLaunchContext {
  providerIds: string[];
  rounds: number;
}

export async function startSessionRepl(input?: {
  launchContext?: SessionLaunchContext;
  promptForTopic?: () => Promise<string | null>;
  confirmLaunch?: (estimate: ReturnType<typeof estimateRunCost>) => Promise<boolean>;
  note?: (message: string, title: string) => void;
  cancel?: (message: string) => void;
}): Promise<void> {
  const launchContext = input?.launchContext ?? {
    providerIds: DEFAULT_PROVIDER_IDS,
    rounds: DEFAULT_ROUNDS
  };
  const promptForTopic = input?.promptForTopic ?? promptForDebateTopic;
  const confirmLaunch =
    input?.confirmLaunch ??
    (async (estimate: ReturnType<typeof estimateRunCost>) =>
      await confirmDebateLaunch({ riskLevel: estimate.riskLevel }));
  const note = input?.note ?? prompts.note;
  const cancel = input?.cancel ?? prompts.cancel;
  const topic = await promptForTopic();

  if (topic === null) {
    return;
  }

  const estimate = estimateRunCost({
    providerIds: launchContext.providerIds,
    rounds: launchContext.rounds,
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
  }
}
