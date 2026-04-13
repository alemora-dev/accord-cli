import { readFile } from 'node:fs/promises';

export async function loadConfig(configFile?: string): Promise<string> {
  const path = configFile ?? `${process.cwd()}/.accordrc`;
  try {
    const content = await readFile(path, 'utf-8');
    const match = content.match(/^ACCORD_LLMS=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return '';
}
