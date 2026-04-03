import { execa } from "execa";

export class ProcessRunner {
  async run(command: string, args: string[], input: string, cwd?: string): Promise<string> {
    const result = await execa(command, args, {
      cwd,
      input,
      stdout: "pipe",
      stderr: "pipe"
    });

    return result.stdout;
  }
}
