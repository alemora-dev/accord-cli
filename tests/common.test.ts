import { describe, test, expect } from 'bun:test';
import { slugify, topicSlug, promptMode, timestamp } from '../src/common';

describe('slugify', () => {
  test('lowercases and replaces non-alphanumeric', () => {
    expect(slugify('Recent AI coding agents')).toBe('recent-ai-coding-agents');
  });

  test('collapses multiple separators', () => {
    expect(slugify('hello  --  world')).toBe('hello-world');
  });
});

describe('topicSlug', () => {
  test('returns first two words', () => {
    expect(topicSlug('Recent AI coding agents')).toBe('recent-ai');
  });

  test('handles single word', () => {
    expect(topicSlug('kubernetes')).toBe('kubernetes');
  });

  test('falls back to topic for empty input', () => {
    expect(topicSlug('   ')).toBe('topic');
  });
});

describe('promptMode', () => {
  test('returns compact for plain topic', () => {
    expect(promptMode('What is the color of the sky?')).toBe('compact');
  });

  test('returns detailed for analysis keyword', () => {
    expect(promptMode('Compare the current status with the old analysis')).toBe('detailed');
  });

  test('returns detailed for roadmap keyword', () => {
    expect(promptMode('Build a roadmap for the next quarter')).toBe('detailed');
  });

  test('returns detailed for go live keyword', () => {
    expect(promptMode('Plan the go live for Europe')).toBe('detailed');
  });
});

describe('timestamp', () => {
  test('uses ACCORD_FIXED_TIMESTAMP when set', () => {
    process.env.ACCORD_FIXED_TIMESTAMP = '2026-04-05T12-00-00Z';
    expect(timestamp()).toBe('2026-04-05T12-00-00Z');
    delete process.env.ACCORD_FIXED_TIMESTAMP;
  });

  test('returns ISO-ish string without fixed env', () => {
    const ts = timestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
  });
});
