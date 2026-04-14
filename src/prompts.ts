import { statSync } from 'node:fs';
import { promptMode, readFileOr, type PromptMode } from './common.ts';

import sharedResearchMd from './prompts/shared-research.md' with { type: 'text' };
import sharedResearchDetailedMd from './prompts/shared-research.detailed.md' with { type: 'text' };
import providerUnderstandingMd from './prompts/provider-understanding.md' with { type: 'text' };
import providerUnderstandingDetailedMd from './prompts/provider-understanding.detailed.md' with { type: 'text' };
import providerOpinionMd from './prompts/provider-opinion.md' with { type: 'text' };
import providerOpinionDetailedMd from './prompts/provider-opinion.detailed.md' with { type: 'text' };
import providerDebateMd from './prompts/provider-debate.md' with { type: 'text' };
import providerDebateDetailedMd from './prompts/provider-debate.detailed.md' with { type: 'text' };
import finalSynthesisMd from './prompts/final-synthesis.md' with { type: 'text' };
import finalSynthesisDetailedMd from './prompts/final-synthesis.detailed.md' with { type: 'text' };

const TEMPLATES: Record<string, string> = {
  'shared-research': sharedResearchMd,
  'shared-research.detailed': sharedResearchDetailedMd,
  'provider-understanding': providerUnderstandingMd,
  'provider-understanding.detailed': providerUnderstandingDetailedMd,
  'provider-opinion': providerOpinionMd,
  'provider-opinion.detailed': providerOpinionDetailedMd,
  'provider-debate': providerDebateMd,
  'provider-debate.detailed': providerDebateDetailedMd,
  'final-synthesis': finalSynthesisMd,
  'final-synthesis.detailed': finalSynthesisDetailedMd,
};

function loadTemplate(name: string, mode: PromptMode): string {
  if (mode === 'detailed') {
    const detailed = TEMPLATES[`${name}.detailed`];
    if (detailed) return detailed;
  }
  return TEMPLATES[name]!;
}

export async function sharedResearchPrompt(topic: string, slug: string): Promise<string> {
  const mode = promptMode(topic);
  const template = loadTemplate('shared-research', mode);
  return `${template}\n\nStage: shared_research\nTopic: ${topic}\nTopic slug: ${slug}\nPrompt mode: ${mode}`;
}

export async function providerUnderstandingPrompt(
  topic: string,
  slug: string,
  provider: string,
  researchFile: string
): Promise<string> {
  const mode = promptMode(topic);
  const template = loadTemplate('provider-understanding', mode);
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
  const template = loadTemplate('provider-opinion', mode);
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
  const template = loadTemplate('provider-debate', mode);
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
  const template = loadTemplate('final-synthesis', mode);
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
