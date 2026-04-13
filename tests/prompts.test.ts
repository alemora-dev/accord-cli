import { describe, test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sharedResearchPrompt,
  providerUnderstandingPrompt,
  providerOpinionPrompt,
  providerDebatePrompt,
  finalSynthesisPrompt,
} from '../src/prompts';

function makeTmpFiles() {
  const dir = mkdtempSync(join(tmpdir(), 'accord-test-'));
  const research = join(dir, 'research.md');
  const understanding = join(dir, 'understanding.md');
  const opinion = join(dir, 'opinion.md');
  const debate = join(dir, 'debate.md');
  writeFileSync(research, '# Research\n\n- Fact: something useful');
  writeFileSync(understanding, '# Understanding\n\n- Fact: something useful');
  writeFileSync(opinion, '# Opinion\n\n- Answer: something useful');
  writeFileSync(debate, '# Debate\n\n- Revision: something useful');
  return { dir, research, understanding, opinion, debate };
}

describe('sharedResearchPrompt (compact)', () => {
  test('contains compact template guidance', async () => {
    const prompt = await sharedResearchPrompt('Prompt topic', 'prompt-topic');
    expect(prompt).toContain('reuse without re-reading the sources');
    expect(prompt).toContain('one short lead line, then 4 to 6 bullets');
    expect(prompt).toContain('Sources list in plain markdown bullets');
  });
});

describe('sharedResearchPrompt (detailed)', () => {
  test('contains detailed template guidance for analysis topics', async () => {
    const prompt = await sharedResearchPrompt(
      'Compare the current status with the old analysis and give me a recent analysis, roadmap, launch gaps, MVP blockers, and next steps for Europe go-live.',
      'compare-the'
    );
    expect(prompt).toContain('## Summary');
    expect(prompt).toContain('## Key Findings');
  });
});

describe('providerUnderstandingPrompt', () => {
  test('contains understanding template guidance', async () => {
    const { research } = makeTmpFiles();
    const prompt = await providerUnderstandingPrompt('Prompt topic', 'prompt-topic', 'codex', research);
    expect(prompt).toContain('3 bullets max');
    expect(prompt).toContain('say when the research is thin');
  });
});

describe('providerOpinionPrompt', () => {
  test('contains opinion template guidance', async () => {
    const { research, understanding } = makeTmpFiles();
    const prompt = await providerOpinionPrompt('Prompt topic', 'prompt-topic', 'codex', research, understanding);
    expect(prompt).toContain('start with the answer or recommendation in one sentence');
    expect(prompt).toContain('exactly 3 bullets');
  });
});

describe('providerDebatePrompt', () => {
  test('contains debate template guidance', async () => {
    const { research, opinion, debate } = makeTmpFiles();
    const prompt = await providerDebatePrompt('Prompt topic', 'prompt-topic', 'codex', research, opinion, [debate]);
    expect(prompt).toContain('2 to 4 bullets only');
    expect(prompt).toContain('if nothing changes, say that plainly');
  });
});

describe('finalSynthesisPrompt', () => {
  test('contains synthesis template guidance', async () => {
    const { research, understanding, opinion, debate } = makeTmpFiles();
    const prompt = await finalSynthesisPrompt(
      'Prompt topic', 'prompt-topic', 'codex', research,
      [understanding, opinion, debate]
    );
    expect(prompt).toContain('best final answer in one sentence');
    expect(prompt).toContain('exactly 3 bullets for agreement, caveat, and next action');
    expect(prompt).toContain('do not repeat them line by line');
  });
});
