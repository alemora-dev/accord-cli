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

export async function providerAvailable(name: string): Promise<boolean> {
  const cmd = providerCommand(name);
  try {
    // Use shell which to ensure PATH resolution
    const proc = Bun.spawn(['bash', '-c', `which ${cmd}`], { stdout: 'ignore', stderr: 'ignore' });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

export async function resolveAvailableProviders(
  providers: string[]
): Promise<{ available: string[]; missing: string[] }> {
  const checks = await Promise.all(providers.map(p => providerAvailable(p)));
  const available: string[] = [];
  const missing: string[] = [];
  providers.forEach((p, i) => (checks[i] ? available : missing).push(p));
  return { available, missing };
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
  try { await Bun.$`rm -f ${outputFile}`.quiet(); } catch {}

  let proc: ReturnType<typeof Bun.spawn>;

  if (style === 'codex') {
    const baseArgs = ['--skip-git-repo-check', '-C', runDir, '-o', outputFile, prompt];
    const args = mode === 'shared_research' ? ['--search', 'exec', ...baseArgs] : ['exec', ...baseArgs];
    proc = Bun.spawn([cmd, ...args], { stdout: 'ignore', stderr: 'inherit', stdin: 'ignore' });
  } else if (style === 'claude') {
    proc = Bun.spawn([cmd, '-p', '--output-format', 'text', prompt], {
      stdout: Bun.file(outputFile),
      stderr: 'inherit',
      stdin: 'ignore',
    });
  } else if (style === 'gemini') {
    proc = Bun.spawn([cmd, '-p', prompt], {
      stdout: Bun.file(outputFile),
      stderr: 'inherit',
      stdin: 'ignore',
    });
  } else {
    fail(`Unsupported provider style: ${style}`);
  }

  const code = await proc.exited;
  if (code !== 0) return false;

  try {
    const stat = await Bun.file(outputFile).stat();
    return stat.size > 0;
  } catch {
    return false;
  }
}
