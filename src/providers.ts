import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { createWriteStream, rmSync, statSync } from 'node:fs';
import { fail, log } from './common.ts';

export type ProviderStyle = 'codex' | 'claude' | 'gemini';
export type RunMode =
  | 'shared_research'
  | 'provider_understanding'
  | 'provider_opinion'
  | 'provider_debate'
  | 'final_synthesis';

const BUILT_IN_STYLES = new Set<string>(['codex', 'claude', 'gemini']);

const LEGACY_BIN_VARS: Record<string, string> = {
  codex: 'ACCORD_CODEX_BIN',
  claude: 'ACCORD_CLAUDE_BIN',
  gemini: 'ACCORD_GEMINI_BIN',
};

export function providerKey(name: string): string {
  return name.toUpperCase().replace(/-/g, '_');
}

export function providerStyle(name: string): string {
  const key = providerKey(name);
  const envStyle = process.env[`ACCORD_PROVIDER_${key}_STYLE`];
  if (envStyle) return envStyle;
  if (BUILT_IN_STYLES.has(name)) return name;
  return '';
}

export function providerCommand(name: string): string {
  const key = providerKey(name);
  const binVar = process.env[`ACCORD_PROVIDER_${key}_BIN`];
  if (binVar) return binVar;

  const style = providerStyle(name);
  const legacyVarName = LEGACY_BIN_VARS[style];
  if (legacyVarName && process.env[legacyVarName]) return process.env[legacyVarName]!;

  if (!style) fail(`Unsupported provider: ${name}`);
  return style;
}

export function configuredProviderNames(): string[] {
  const configured = process.env.ACCORD_PROVIDERS ?? 'codex,claude,gemini';
  return configured.split(',').map(p => p.trim()).filter(Boolean);
}

export function providerStyleSupported(style: string): boolean {
  return BUILT_IN_STYLES.has(style);
}

export function providerSupported(name: string): boolean {
  const names = configuredProviderNames();
  if (!names.includes(name)) return false;
  const style = providerStyle(name);
  return providerStyleSupported(style);
}

function which(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function providerAvailable(name: string): boolean {
  const cmd = providerCommand(name);
  return which(cmd);
}

export function resolveAvailableProviders(
  providers: string[]
): { available: string[]; missing: string[] } {
  const available: string[] = [];
  const missing: string[] = [];
  for (const p of providers) {
    (providerAvailable(p) ? available : missing).push(p);
  }
  return { available, missing };
}

function spawnToFile(
  cmd: string,
  args: string[],
  outputFile: string
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    proc.stdout!.pipe(createWriteStream(outputFile));
    proc.on('close', resolve);
  });
}

function spawnIgnoreOutput(
  cmd: string,
  args: string[]
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    proc.on('close', resolve);
  });
}

export async function runProvider(
  provider: string,
  prompt: string,
  outputFile: string,
  mode: RunMode,
  runDir: string
): Promise<boolean> {
  const cmd = providerCommand(provider);
  const style = providerStyle(provider);

  // Remove stale output file before running
  try { rmSync(outputFile, { force: true }); } catch {}

  let code: number;

  if (style === 'codex') {
    const baseArgs = ['--skip-git-repo-check', '-C', runDir, '-o', outputFile, prompt];
    const args = mode === 'shared_research' ? ['--search', 'exec', ...baseArgs] : ['exec', ...baseArgs];
    code = await spawnIgnoreOutput(cmd, args);
  } else if (style === 'claude') {
    code = await spawnToFile(cmd, ['-p', '--output-format', 'text', prompt], outputFile);
  } else if (style === 'gemini') {
    code = await spawnToFile(cmd, ['-p', prompt], outputFile);
  } else {
    fail(`Unsupported provider style: ${style}`);
  }

  if (code! !== 0) return false;

  try {
    return statSync(outputFile).size > 0;
  } catch {
    return false;
  }
}
