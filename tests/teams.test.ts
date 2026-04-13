import { describe, test, expect } from 'bun:test';
import { isValidTeam, teamPersonaPrefix, VALID_TEAMS } from '../src/teams';

describe('isValidTeam', () => {
  test('returns true for valid teams', () => {
    VALID_TEAMS.forEach(t => expect(isValidTeam(t)).toBe(true));
  });

  test('returns false for invalid team', () => {
    expect(isValidTeam('hacking')).toBe(false);
  });
});

describe('teamPersonaPrefix', () => {
  test('security persona contains security language', async () => {
    const prefix = await teamPersonaPrefix('security');
    expect(prefix.toLowerCase()).toContain('security');
  });

  test('architecture persona contains architecture language', async () => {
    const prefix = await teamPersonaPrefix('architecture');
    expect(prefix.toLowerCase()).toContain('architect');
  });

  test('prefix ends with double newline', async () => {
    const prefix = await teamPersonaPrefix('debug');
    expect(prefix.endsWith('\n\n')).toBe(true);
  });
});
