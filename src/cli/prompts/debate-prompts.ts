import * as prompts from "@clack/prompts";

export async function promptForDebateTopic(): Promise<string | null> {
  const topic = await prompts.text({
    message: "What topic should the agents debate?"
  });

  if (prompts.isCancel(topic)) {
    prompts.cancel("Session cancelled.");
    return null;
  }

  return String(topic).trim();
}

export async function confirmDebateLaunch(input: {
  riskLevel: "low" | "medium" | "high";
}): Promise<boolean> {
  const shouldLaunch = await prompts.confirm({
    message: `Proceed with this ${input.riskLevel}-risk run?`,
    initialValue: input.riskLevel !== "high"
  });

  return !prompts.isCancel(shouldLaunch) && Boolean(shouldLaunch);
}
