import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  providerKey,
  providerStyle,
  providerCommand,
  configuredProviderNames,
  providerSupported,
} from '../src/providers';

const savedEnv: Record<string, string | undefined> = {};
function saveEnv(...keys: string[]) {
  keys.forEach(k => { savedEnv[k] = process.env[k]; });
}
function restoreEnv(...keys: string[]) {
  keys.forEach(k => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
}

describe('providerKey', () => {
  test('uppercases and replaces hyphens', () => {
    expect(providerKey('my-provider')).toBe('MY_PROVIDER');
  });
});

describe('providerStyle', () => {
  test('returns name for built-in styles', () => {
    expect(providerStyle('codex')).toBe('codex');
    expect(providerStyle('claude')).toBe('claude');
    expect(providerStyle('gemini')).toBe('gemini');
  });

  test('reads from ACCORD_PROVIDER_<KEY>_STYLE env', () => {
    process.env.ACCORD_PROVIDER_WRITER_STYLE = 'codex';
    expect(providerStyle('writer')).toBe('codex');
    delete process.env.ACCORD_PROVIDER_WRITER_STYLE;
  });

  test('returns empty string for unknown provider', () => {
    expect(providerStyle('unknown')).toBe('');
  });
});

describe('providerCommand', () => {
  test('uses ACCORD_PROVIDER_<KEY>_BIN when set', () => {
    saveEnv('ACCORD_PROVIDER_CODEX_BIN');
    process.env.ACCORD_PROVIDER_CODEX_BIN = '/custom/codex';
    expect(providerCommand('codex')).toBe('/custom/codex');
    restoreEnv('ACCORD_PROVIDER_CODEX_BIN');
  });

  test('falls back to legacy ACCORD_CODEX_BIN', () => {
    saveEnv('ACCORD_CODEX_BIN');
    process.env.ACCORD_CODEX_BIN = '/legacy/codex';
    expect(providerCommand('codex')).toBe('/legacy/codex');
    restoreEnv('ACCORD_CODEX_BIN');
  });

  test('returns style name as default command', () => {
    saveEnv('ACCORD_CODEX_BIN');
    delete process.env.ACCORD_CODEX_BIN;
    expect(providerCommand('codex')).toBe('codex');
    restoreEnv('ACCORD_CODEX_BIN');
  });
});

describe('configuredProviderNames', () => {
  test('returns default providers when env not set', () => {
    saveEnv('ACCORD_PROVIDERS');
    delete process.env.ACCORD_PROVIDERS;
    expect(configuredProviderNames()).toEqual(['codex', 'claude', 'gemini']);
    restoreEnv('ACCORD_PROVIDERS');
  });

  test('reads from ACCORD_PROVIDERS env', () => {
    process.env.ACCORD_PROVIDERS = 'writer,critic';
    expect(configuredProviderNames()).toEqual(['writer', 'critic']);
    delete process.env.ACCORD_PROVIDERS;
  });
});

describe('providerSupported', () => {
  test('returns true for default built-in providers', () => {
    expect(providerSupported('codex')).toBe(true);
    expect(providerSupported('claude')).toBe(true);
    expect(providerSupported('gemini')).toBe(true);
  });

  test('returns false for unknown provider', () => {
    expect(providerSupported('gpt4')).toBe(false);
  });
});
