import { describe, test, expect } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  artifactPath,
  runSummaryPath,
  writeRunSummary,
  collectPeerOpinionFiles,
} from '../src/artifacts';

describe('artifactPath', () => {
  test('formats path correctly', () => {
    expect(artifactPath('/runs/abc', 'recent-ai', 'claude_opinion_1'))
      .toBe('/runs/abc/recent-ai_claude_opinion_1.md');
  });
});

describe('runSummaryPath', () => {
  test('returns run_summary.md path', () => {
    expect(runSummaryPath('/runs/abc')).toBe('/runs/abc/run_summary.md');
  });
});

describe('writeRunSummary', () => {
  test('writes coordinator, debaters, providers, and artifacts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'accord-artifacts-test-'));
    await writeRunSummary(dir, 'topic', 'codex', ['claude', 'gemini'], ['codex', 'claude', 'gemini'], [
      `${dir}/topic_research_1.md`,
      `${dir}/topic_final_1.md`,
    ]);
    const content = await Bun.file(`${dir}/run_summary.md`).text();
    expect(content).toContain('Coordinator: codex');
    expect(content).toContain('Debaters: claude, gemini');
    expect(content).toContain('codex -> codex');
    expect(content).toContain('claude -> claude');
    expect(content).toContain('gemini -> gemini');
    expect(content).toContain('topic_research_1.md');
    expect(content).toContain('topic_final_1.md');
    expect(content).toContain('Token estimate: unknown');
    expect(content).toContain('Cost estimate: unknown');
  });
});

describe('collectPeerOpinionFiles', () => {
  test('excludes current provider', () => {
    const peers = collectPeerOpinionFiles('/runs/abc', 'topic', 'claude', ['claude', 'gemini']);
    expect(peers).toEqual(['/runs/abc/topic_gemini_opinion_1.md']);
  });

  test('returns empty array when no other providers', () => {
    const peers = collectPeerOpinionFiles('/runs/abc', 'topic', 'claude', ['claude']);
    expect(peers).toEqual([]);
  });
});
