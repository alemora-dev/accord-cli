import { describe, test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, chmodSync, existsSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const FAKE_PROVIDER = join(import.meta.dir, 'fixtures/fake-provider.sh');
const TEST_PATH = (fakeBin: string) => `${fakeBin}:${process.env.PATH}`;

// During development use Bun to run main.ts, override with ACCORD_BIN for binary testing
const ACCORD_BIN = [process.execPath, 'run', join(ROOT, 'src/main.ts')];

function makeFakeBin(destination: string, ...providers: string[]): void {
  mkdirSync(destination, { recursive: true });
  for (const p of providers) {
    const dest = join(destination, p);
    const content = readFileSync(FAKE_PROVIDER, 'utf8');
    writeFileSync(dest, content);
    chmodSync(dest, 0o755);
  }
}

async function runAccord(
  extraEnv: Record<string, string>,
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn([...ACCORD_BIN, ...args], {
    env: { ...process.env, ...extraEnv },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe('version flag', () => {
  test('prints 2.0.0 and help mentions --version', async () => {
    const { stdout, exitCode } = await runAccord({}, '--version');
    expect(exitCode).toBe(0);
    expect(stdout).toBe('2.0.0');

    const help = await runAccord({}, '--help');
    expect(help.stdout).toContain('--version');
  });
});

describe('full run creates expected artifacts', () => {
  test('all stage files are written for all debaters', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');

    const { exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-00Z',
    }, '--output', join(tmpDir, 'runs'), 'Recent AI coding agents');

    expect(exitCode).toBe(0);
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-00Z-recent-ai');
    expect(existsSync(join(runDir, 'recent-ai_research_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_claude_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_gemini_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_claude_opinion_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_gemini_opinion_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_claude_debate_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_gemini_debate_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'recent-ai_final_1.md'))).toBe(true);
    // Coordinator (codex) should NOT have debater artifacts
    expect(existsSync(join(runDir, 'recent-ai_codex_understanding_1.md'))).toBe(false);
    expect(existsSync(join(runDir, 'recent-ai_codex_opinion_1.md'))).toBe(false);

    const research = readFileSync(join(runDir, 'recent-ai_research_1.md'), 'utf8');
    expect(research).toContain('Shared research');
    const final = readFileSync(join(runDir, 'recent-ai_final_1.md'), 'utf8');
    expect(final).toContain('Final synthesis');
  });
});

describe('run summary', () => {
  test('describes roles, styles, and artifacts', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');

    await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-00Z',
    }, '--output', join(tmpDir, 'runs'), 'Recent AI coding agents');

    const summary = readFileSync(
      join(tmpDir, 'runs/2026-04-05T12-00-00Z-recent-ai/run_summary.md'),
      'utf8'
    );
    expect(summary).toContain('Coordinator: codex');
    expect(summary).toContain('Debaters: claude, gemini');
    expect(summary).toContain('codex -> codex');
    expect(summary).toContain('claude -> claude');
    expect(summary).toContain('gemini -> gemini');
    expect(summary).toContain('recent-ai_research_1.md');
    expect(summary).toContain('recent-ai_final_1.md');
    expect(summary).toContain('Token estimate: unknown');
  });
});

describe('missing provider continues with available ones', () => {
  test('drops missing provider and keeps going', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'gemini'); // no claude

    const { stderr, exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: '/dev/null/no-claude',
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-01Z',
    }, '--output', join(tmpDir, 'runs'), 'Missing Claude example');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('[accord] Missing providers: claude');
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-01Z-missing-claude');
    expect(existsSync(join(runDir, 'missing-claude_research_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'missing-claude_gemini_opinion_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'missing-claude_codex_opinion_1.md'))).toBe(false);
    expect(existsSync(join(runDir, 'missing-claude_claude_opinion_1.md'))).toBe(false);
    expect(existsSync(join(runDir, 'missing-claude_final_1.md'))).toBe(true);
  });
});

describe('coordinator fallback', () => {
  test('falls back to available provider when default coordinator is missing', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'gemini'); // no codex

    const { stderr, exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: '/dev/null/no-codex',
      ACCORD_CLAUDE_BIN: '/dev/null/no-claude',
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-02Z',
      ACCORD_CONFIG_FILE: '/dev/null/no-config',
    }, '--output', join(tmpDir, 'runs'), 'Gemini only example');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('[accord] Coordinator codex is unavailable; falling back to gemini');
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-02Z-gemini-only');
    expect(existsSync(join(runDir, 'gemini-only_research_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'gemini-only_gemini_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'gemini-only_final_1.md'))).toBe(true);
  });
});

describe('--llms flag', () => {
  test('assigns roles and preserves order', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');

    const { stderr, exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-03Z',
    }, '--output', join(tmpDir, 'runs'),
      '--llms', 'codex:coordinator,gemini:debater,claude:debater',
      'Ordered roles example');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('Coordinator: codex');
    expect(stderr).toContain('Debaters: gemini, claude');
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-03Z-ordered-roles');
    expect(existsSync(join(runDir, 'ordered-roles_gemini_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'ordered-roles_claude_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'ordered-roles_codex_understanding_1.md'))).toBe(false);
  });

  test('rejects unknown roles', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude');

    const { exitCode, stderr } = await runAccord({
      PATH: TEST_PATH(fakeBin),
    }, '--output', join(tmpDir, 'runs'),
      '--llms', 'codex:coordinator,claude:judge',
      'Bad roles');

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Unsupported LLM role');
  });
});

describe('.accordrc defaults', () => {
  test('uses config when --llms flag is absent', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    const configPath = join(tmpDir, '.accordrc');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');
    writeFileSync(configPath, 'ACCORD_LLMS=gemini:coordinator,codex:debater\n');

    const { stderr, exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_CONFIG_FILE: configPath,
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-04Z',
    }, '--output', join(tmpDir, 'runs'), 'Config roles example');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('Coordinator: gemini');
    expect(stderr).toContain('Debaters: codex');
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-04Z-config-roles');
    expect(existsSync(join(runDir, 'config-roles_codex_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'config-roles_gemini_understanding_1.md'))).toBe(false);
  });

  test('--llms flag overrides .accordrc', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    const configPath = join(tmpDir, '.accordrc');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');
    writeFileSync(configPath, 'ACCORD_LLMS=gemini:coordinator,codex:debater\n');

    const { stderr, exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_CONFIG_FILE: configPath,
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-05Z',
    }, '--output', join(tmpDir, 'runs'),
      '--llms', 'codex:coordinator,claude:debater',
      'Flag beats config');

    expect(exitCode).toBe(0);
    expect(stderr).toContain('Coordinator: codex');
    expect(stderr).toContain('Debaters: claude');
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-05Z-flag-beats');
    expect(existsSync(join(runDir, 'flag-beats_claude_understanding_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'flag-beats_codex_understanding_1.md'))).toBe(false);
    expect(existsSync(join(runDir, 'flag-beats_gemini_understanding_1.md'))).toBe(false);
  });
});

describe('long prompt slug', () => {
  test('compacts long topic to two-word slug', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');
    const longTopic = 'read code from /Users/diegoamaya/Documents/ale_mora/projects/accord-cli all files understand the market check reddit and propose missing features while keeping the tool simple powerful elegant and reliable for open source users '.repeat(3);

    await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-06Z',
    }, '--output', join(tmpDir, 'runs'),
      '--llms', 'codex:coordinator,claude:debater,gemini:debater',
      longTopic.trim());

    const runsDir = join(tmpDir, 'runs');
    const entries = readdirSync(runsDir);
    expect(entries.length).toBe(1);
    expect(entries[0]).toBe('2026-04-05T12-00-06Z-read-code');
  });
});

describe('--team flag', () => {
  test('run completes successfully with --team security', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'accord-int-'));
    const fakeBin = join(tmpDir, 'fake-bin');
    makeFakeBin(fakeBin, 'codex', 'claude', 'gemini');

    const { exitCode } = await runAccord({
      PATH: TEST_PATH(fakeBin),
      ACCORD_CODEX_BIN: join(fakeBin, 'codex'),
      ACCORD_CLAUDE_BIN: join(fakeBin, 'claude'),
      ACCORD_GEMINI_BIN: join(fakeBin, 'gemini'),
      ACCORD_FIXED_TIMESTAMP: '2026-04-05T12-00-07Z',
    }, '--output', join(tmpDir, 'runs'),
      '--llms', 'codex:coordinator,claude:debater,gemini:debater',
      '--team', 'security',
      'Review the auth flow');

    expect(exitCode).toBe(0);
    const runDir = join(tmpDir, 'runs/2026-04-05T12-00-07Z-review-the');
    expect(existsSync(join(runDir, 'review-the_claude_opinion_1.md'))).toBe(true);
    expect(existsSync(join(runDir, 'review-the_final_1.md'))).toBe(true);
  });
});
