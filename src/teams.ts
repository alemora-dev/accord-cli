export const VALID_TEAMS = ['security', 'architecture', 'performance', 'debug'] as const;
export type TeamPreset = (typeof VALID_TEAMS)[number];

export function isValidTeam(team: string): team is TeamPreset {
  return (VALID_TEAMS as readonly string[]).includes(team);
}

export async function teamPersonaPrefix(team: TeamPreset): Promise<string> {
  const content = await Bun.file(new URL(`./teams/${team}.md`, import.meta.url)).text();
  return content.trim() + '\n\n';
}
