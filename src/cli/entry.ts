import { Command } from "commander";
import { resolveStorageDir } from "../infrastructure/fs/path-resolver.js";
import { SessionRepository } from "../infrastructure/fs/session-repository.js";
import { parseAccordConfig } from "../infrastructure/config/config-loader.js";
import { runProviderSetup } from "../application/use-cases/setup-providers.js";
import { resumeSession } from "../application/use-cases/resume-session.js";
import { detectProviders } from "../providers/core/provider-detection.js";
import { startSessionRepl } from "./repl/session-repl.js";
import { confirmInteractiveLaunch, presentSetupSummary } from "./prompts/setup-prompts.js";

const BUILTIN_PROVIDERS = [
  { id: "codex", command: "codex" },
  { id: "claude", command: "claude" },
  { id: "gemini", command: "gemini" }
] as const;

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("accord")
    .description("Run structured multi-agent research debates")
    .action(async () => {
      await startSessionRepl({
        launchContext: {
          providerIds: BUILTIN_PROVIDERS.map((provider) => provider.id),
          rounds: 2
        }
      });
    });

  program
    .command("setup")
    .description("Configure local providers")
    .action(async () => {
      const summary = await runProviderSetup({
        providers: BUILTIN_PROVIDERS.map((provider) => ({ ...provider })),
        detectAvailableProviders: async (providers) => await detectProviders(providers, hasCommand)
      });
      const setupDetails = summary.providers
        .map((provider) => `${provider.id}: ${provider.status}`)
        .join("\n");

      presentSetupSummary(setupDetails);

      if (summary.canLaunch && (await confirmInteractiveLaunch())) {
        await startSessionRepl({
          launchContext: {
            providerIds: summary.providers
              .filter((provider) => provider.status === "detected")
              .map((provider) => provider.id),
            rounds: 2
          }
        });
      }
    });
  program.command("sessions").description("List saved debate sessions");
  program
    .command("resume")
    .argument("<sessionId>")
    .description("Resume a saved session")
    .action(async (sessionId: string) => {
      const config = parseAccordConfig({});
      const repository = new SessionRepository(resolveStorageDir(process.cwd(), config.storageDir));
      const result = await resumeSession({ sessionId, repository });

      if (result.status === "invalid") {
        presentSetupSummary(`Invalid session id: ${result.sessionId}.`);
        return;
      }

      if (result.status === "not_found") {
        presentSetupSummary(`No saved session found for ${result.sessionId}.`);
        return;
      }

      presentSetupSummary(`Loaded session ${result.sessionId}: ${result.session.title}`);
    });
  program.command("export").argument("<sessionId>").description("Export a saved session");

  return program;
}

async function hasCommand(command: string): Promise<boolean> {
  const module = await import("node:child_process");

  return await new Promise<boolean>((resolve) => {
    const child = module.spawn("which", [command], {
      stdio: "ignore"
    });

    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
