import { mkdirSync } from 'node:fs';
import { providerStyle } from './providers.ts';

export function artifactPath(runDir: string, slug: string, suffix: string): string {
  return `${runDir}/${slug}_${suffix}.md`;
}

export function runSummaryPath(runDir: string): string {
  return `${runDir}/run_summary.md`;
}

export function ensureRunDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export async function writeRunSummary(
  runDir: string,
  slug: string,
  coordinator: string,
  debaters: string[],
  allProviders: string[],
  artifactFiles: string[]
): Promise<void> {
  const summaryFile = runSummaryPath(runDir);

  const providerLines = allProviders
    .map(p => `- ${p} -> ${providerStyle(p) || p}`)
    .join('\n');

  const artifactLines = artifactFiles
    .map(f => `- ${f.split('/').pop()}`)
    .join('\n');

  const content = [
    '# Run summary',
    '',
    `- Coordinator: ${coordinator}`,
    `- Debaters: ${debaters.join(', ')}`,
    '- Token estimate: unknown',
    '- Cost estimate: unknown',
    '',
    '## Provider styles',
    '',
    providerLines,
    '',
    '## Artifacts',
    '',
    artifactLines,
  ].join('\n') + '\n';

  await Bun.write(summaryFile, content);
}

export function collectPeerOpinionFiles(
  runDir: string,
  slug: string,
  currentProvider: string,
  providers: string[]
): string[] {
  return providers
    .filter(p => p !== currentProvider)
    .map(p => artifactPath(runDir, slug, `${p}_opinion_1`));
}
