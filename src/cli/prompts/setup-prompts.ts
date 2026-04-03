import * as prompts from "@clack/prompts";

export function presentSetupSummary(summary: string): void {
  prompts.note(summary, "Provider setup");
}

export async function confirmInteractiveLaunch(): Promise<boolean> {
  const shouldLaunch = await prompts.confirm({
    message: "Open the guided debate shell now?",
    initialValue: true
  });

  return !prompts.isCancel(shouldLaunch) && Boolean(shouldLaunch);
}
