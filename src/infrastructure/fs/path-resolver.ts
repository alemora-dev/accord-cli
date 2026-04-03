import path from "node:path";

export function resolveStorageDir(cwd: string, configuredDir: string): string {
  return path.resolve(cwd, configuredDir);
}
