import { readFileSync } from 'node:fs';

export type PromptMode = 'compact' | 'detailed';

const DETAILED_KEYWORDS = [
  'analysis', 'analyse', 'analyze', 'roadmap', 'compare', 'comparison',
  'audit', 'gap', 'gaps', 'launch', 'go live', 'mvp', 'strategy', 'market',
  'status', 'iterate', 'plan', 'planning', 'review', 'evaluate', 'readiness',
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function topicSlug(topic: string): string {
  const raw = slugify(topic);
  if (!raw) return 'topic';
  const dash = raw.indexOf('-');
  if (dash === -1) return raw;
  const first = raw.slice(0, dash);
  const rest = raw.slice(dash + 1);
  const second = rest.split('-')[0];
  return `${first}-${second}`;
}

export function timestamp(): string {
  if (process.env.ACCORD_FIXED_TIMESTAMP) return process.env.ACCORD_FIXED_TIMESTAMP;
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

export function promptMode(topic: string): PromptMode {
  const lower = topic.toLowerCase();
  if (DETAILED_KEYWORDS.some(kw => lower.includes(kw))) return 'detailed';
  return 'compact';
}

export function log(message: string): void {
  process.stderr.write(`[accord] ${message}\n`);
}

export function fail(message: string): never {
  process.stderr.write(`[accord] ${message}\n`);
  process.exit(1);
}

export function readFileOr(path: string, fallback = ''): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return fallback;
  }
}
