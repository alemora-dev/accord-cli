import securityMd from './teams/security.md' with { type: 'text' };
import architectureMd from './teams/architecture.md' with { type: 'text' };
import performanceMd from './teams/performance.md' with { type: 'text' };
import debugMd from './teams/debug.md' with { type: 'text' };

export const VALID_TEAMS = ['security', 'architecture', 'performance', 'debug'] as const;
export type TeamPreset = (typeof VALID_TEAMS)[number];

export function isValidTeam(team: string): team is TeamPreset {
  return (VALID_TEAMS as readonly string[]).includes(team);
}

const TEAM_PERSONAS: Record<TeamPreset, string> = {
  security: securityMd,
  architecture: architectureMd,
  performance: performanceMd,
  debug: debugMd,
};

export async function teamPersonaPrefix(team: TeamPreset): Promise<string> {
  return TEAM_PERSONAS[team].trim() + '\n\n';
}
