import { statSync } from 'node:fs';
import { promptMode, readFileOr, type PromptMode } from './common.ts';

async function loadTemplate(name: string, mode: PromptMode): Promise<string> {
  if (mode === 'detailed') {
    try {
      return await Bun.file(new URL(`./prompts/${name}.detailed.md`, import.meta.url)).text();
    } catch {}
  }
  return await Bun.file(new URL(`./prompts/${name}.md`, import.meta.url)).text();
}

export async function sharedResearchPrompt(topic: string, slug: string): Promise<string> {
  const mode = promptMode(topic);
  const template = await loadTemplate('shared-research', mode);
  return `${template}\n\nStage: shared_research\nTopic: ${topic}\nTopic slug: ${slug}\nPrompt mode: ${mode}`;
}

export async function providerUnderstandingPrompt(
  topic: string,
  slug: string,
  provider: string,
  researchFile: string
): Promise<string> {
  const mode = promptMode(topic);
  const template = await loadTemplate('provider-understanding', mode);
  const research = readFileOr(researchFile);
  return [
    template,
    '',
    `Stage: provider_understanding`,
    `Topic: ${topic}`,
    `Topic slug: ${slug}`,
    `Provider: ${provider}`,
    `Prompt mode: ${mode}`,
    '',
    '## Shared research',
    research,
  ].join('\n');
}

export async function providerOpinionPrompt(
  topic: string,
  slug: string,
  provider: string,
  researchFile: string,
  understandingFile: string
): Promise<string> {
  const mode = promptMode(topic);
  const template = await loadTemplate('provider-opinion', mode);
  const research = readFileOr(researchFile);
  const understanding = readFileOr(understandingFile);
  return [
    template,
    '',
    `Stage: provider_opinion`,
    `Topic: ${topic}`,
    `Topic slug: ${slug}`,
    `Provider: ${provider}`,
    `Prompt mode: ${mode}`,
    '',
    '## Shared research',
    research,
    '',
    '## Your understanding',
    understanding,
  ].join('\n');
}

export async function providerDebatePrompt(
  topic: string,
  slug: string,
  provider: string,
  researchFile: string,
  ownOpinionFile: string,
  peerOpinionFiles: string[]
): Promise<string> {
  const mode = promptMode(topic);
  const template = await loadTemplate('provider-debate', mode);
  const research = readFileOr(researchFile);
  const ownOpinion = readFileOr(ownOpinionFile);

  const peerSection =
    peerOpinionFiles.length === 0
      ? 'No peer opinions were available for this run.'
      : peerOpinionFiles
          .map(f => `\n### ${f.split('/').pop()}\n${readFileOr(f)}`)
          .join('\n');

  return [
    template,
    '',
    `Stage: provider_debate`,
    `Topic: ${topic}`,
    `Topic slug: ${slug}`,
    `Provider: ${provider}`,
    `Prompt mode: ${mode}`,
    '',
    '## Shared research',
    research,
    '',
    '## Your current opinion',
    ownOpinion,
    '',
    '## Peer opinions',
    peerSection,
  ].join('\n');
}

export async function finalSynthesisPrompt(
  topic: string,
  slug: string,
  coordinator: string,
  researchFile: string,
  artifactFiles: string[]
): Promise<string> {
  const mode = promptMode(topic);
  const template = await loadTemplate('final-synthesis', mode);
  const research = readFileOr(researchFile);

  const artifactSection = artifactFiles
    .filter(f => {
      try { return statSync(f).size > 0; } catch { return false; }
    })
    .map(f => `\n### ${f.split('/').pop()}\n${readFileOr(f)}`)
    .join('\n');

  return [
    template,
    '',
    `Stage: final_synthesis`,
    `Topic: ${topic}`,
    `Topic slug: ${slug}`,
    `Coordinator: ${coordinator}`,
    `Prompt mode: ${mode}`,
    '',
    '## Shared research',
    research,
    '',
    '## Provider artifacts',
    artifactSection,
  ].join('\n');
}
