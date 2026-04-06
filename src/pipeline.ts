import { log, fail, topicSlug, timestamp } from './common.ts';
import { resolveAvailableProviders, runProvider, providerSupported, configuredProviderNames } from './providers.ts';
import {
  sharedResearchPrompt,
  providerUnderstandingPrompt,
  providerOpinionPrompt,
  providerDebatePrompt,
  finalSynthesisPrompt,
} from './prompts.ts';
import { artifactPath, ensureRunDir, collectPeerOpinionFiles, writeRunSummary } from './artifacts.ts';
import { isValidTeam, teamPersonaPrefix, type TeamPreset } from './teams.ts';
import { existsSync } from 'node:fs';

export interface RunOptions {
  topic: string;
  llmsSpec?: string;
  coordinator?: string;
  coordinatorExplicit?: boolean;
  providersCSV?: string;
  outputRoot?: string;
  runDir?: string;
  customSlug?: string;
  skipResearch?: boolean;
  skipSynthesis?: boolean;
  team?: string;
  configFile?: string;
}

interface ParsedLlms {
  coordinator: string;
  debaters: string[];
  requested: string[];
}

function parseLlmsSpec(spec: string): ParsedLlms {
  if (!spec) fail('Empty --llms configuration.');
  const entries = spec.split(',').map(e => e.trim()).filter(Boolean);
  if (entries.length === 0) fail('Empty --llms configuration.');

  let coordinator = '';
  const debaters: string[] = [];
  const requested: string[] = [];

  for (const entry of entries) {
    if (!entry.includes(':')) fail(`Malformed --llms entry: ${entry}`);
    const [provider, role] = entry.split(':').map(s => s.trim());
    if (!provider || !role) fail(`Malformed --llms entry: ${entry}`);
    if (!providerSupported(provider)) fail(`Unsupported provider in --llms: ${provider}`);
    if (!requested.includes(provider)) requested.push(provider);

    if (role === 'coordinator') {
      if (coordinator) fail('Only one coordinator may be configured.');
      coordinator = provider;
    } else if (role === 'debater') {
      if (debaters.includes(provider)) fail(`Provider ${provider} is listed as a debater more than once.`);
      debaters.push(provider);
    } else {
      fail(`Unsupported LLM role: ${role}`);
    }
  }

  if (!coordinator) fail('LLM configuration requires one coordinator.');
  if (debaters.length === 0) fail('LLM configuration requires at least one debater.');

  return { coordinator, debaters, requested };
}

function pickCoordinator(requested: string, explicit: boolean, available: string[]): string {
  if (available.includes(requested)) return requested;
  if (explicit) fail(`Coordinator ${requested} is unavailable.`);
  if (available.length === 0) fail('No supported providers are available.');
  log(`Coordinator ${requested} is unavailable; falling back to ${available[0]}`);
  return available[0];
}

async function runStageForProviders(
  stage: 'understanding' | 'opinion' | 'debate',
  providers: string[],
  runDir: string,
  topic: string,
  slug: string,
  researchFile: string,
  team?: TeamPreset
): Promise<string[]> {
  const tasks = providers.map(async provider => {
    let prompt: string;

    switch (stage) {
      case 'understanding':
        prompt = await providerUnderstandingPrompt(topic, slug, provider, researchFile);
        break;
      case 'opinion':
        prompt = await providerOpinionPrompt(
          topic, slug, provider, researchFile,
          artifactPath(runDir, slug, `${provider}_understanding_1`)
        );
        break;
      case 'debate': {
        const peerFiles = collectPeerOpinionFiles(runDir, slug, provider, providers)
          .filter(f => existsSync(f));
        prompt = await providerDebatePrompt(
          topic, slug, provider, researchFile,
          artifactPath(runDir, slug, `${provider}_opinion_1`),
          peerFiles
        );
        break;
      }
    }

    if (team) {
      const prefix = await teamPersonaPrefix(team);
      prompt = prefix + prompt;
    }

    const outputFile = artifactPath(runDir, slug, `${provider}_${stage}_1`);
    log(`Running ${stage} for ${provider}`);
    const ok = await runProvider(provider, prompt, outputFile, `provider_${stage}`, runDir);
    return { provider, ok };
  });

  const results = await Promise.allSettled(tasks);
  const successful: string[] = [];

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.ok) {
      successful.push(result.value.provider);
    } else {
      const provider = result.status === 'fulfilled' ? result.value.provider : '?';
      log(`Provider ${provider} failed during ${stage}; continuing`);
    }
  });

  return successful;
}

export async function runAccord(opts: RunOptions): Promise<string> {
  const {
    topic,
    llmsSpec,
    coordinator: coordinatorOpt = 'codex',
    coordinatorExplicit = false,
    providersCSV = 'codex,claude,gemini',
    outputRoot = 'runs',
    customSlug,
    skipResearch = false,
    skipSynthesis = false,
  } = opts;

  const team = opts.team && isValidTeam(opts.team) ? opts.team : undefined;

  let coordinator: string;
  let activeDebaters: string[];

  if (llmsSpec) {
    const parsed = parseLlmsSpec(llmsSpec);
    const { available, missing } = await resolveAvailableProviders(parsed.requested);
    if (missing.length > 0) log(`Missing providers: ${missing.join(', ')}`);
    coordinator = pickCoordinator(parsed.coordinator, true, available);
    activeDebaters = parsed.debaters.filter(p => available.includes(p));
    if (activeDebaters.length === 0 && available.includes(coordinator) && parsed.debaters.includes(coordinator)) {
      activeDebaters = [coordinator];
    }
    if (activeDebaters.length === 0) fail('No debaters are available to run.');
  } else {
    const requestedProviders = providersCSV.split(',').map(p => p.trim()).filter(Boolean);
    const toCheck = [...new Set([coordinatorOpt, ...requestedProviders])];
    const { available, missing } = await resolveAvailableProviders(toCheck);
    if (missing.length > 0) log(`Missing providers: ${missing.join(', ')}`);
    if (available.length === 0) fail('No providers are available to run.');
    coordinator = pickCoordinator(coordinatorOpt, coordinatorExplicit, available);
    activeDebaters = requestedProviders.filter(p => available.includes(p));
  }

  const slug = customSlug ?? topicSlug(topic);
  const ts = timestamp();
  const runDir = opts.runDir ?? `${outputRoot}/${ts}-${slug}`;
  ensureRunDir(runDir);

  log(`Run directory: ${runDir}`);
  log(`Coordinator: ${coordinator}`);
  log(`Debaters: ${activeDebaters.join(', ')}`);

  const researchFile = artifactPath(runDir, slug, 'research_1');
  const finalFile = artifactPath(runDir, slug, 'final_1');

  if (!skipResearch) {
    const researchPrompt = await sharedResearchPrompt(topic, slug);
    const ok = await runProvider(coordinator, researchPrompt, researchFile, 'shared_research', runDir);
    if (!ok) fail(`Coordinator ${coordinator} failed during shared research.`);
  }

  let active = await runStageForProviders('understanding', activeDebaters, runDir, topic, slug, researchFile, team);
  if (active.length === 0) fail('No providers completed the understanding stage.');

  active = await runStageForProviders('opinion', active, runDir, topic, slug, researchFile, team);
  if (active.length === 0) fail('No providers completed the opinion stage.');

  active = await runStageForProviders('debate', active, runDir, topic, slug, researchFile, team);

  const artifactFiles = [researchFile];
  for (const provider of active) {
    artifactFiles.push(artifactPath(runDir, slug, `${provider}_understanding_1`));
    artifactFiles.push(artifactPath(runDir, slug, `${provider}_opinion_1`));
    const debateFile = artifactPath(runDir, slug, `${provider}_debate_1`);
    if (existsSync(debateFile)) artifactFiles.push(debateFile);
  }

  if (!skipSynthesis) {
    const synthPrompt = await finalSynthesisPrompt(topic, slug, coordinator, researchFile, artifactFiles);
    const ok = await runProvider(coordinator, synthPrompt, finalFile, 'final_synthesis', runDir);
    if (!ok) fail(`Coordinator ${coordinator} failed during final synthesis.`);
  }

  if (existsSync(finalFile)) artifactFiles.push(finalFile);

  const allProviders = [coordinator, ...active.filter(p => p !== coordinator)];
  await writeRunSummary(runDir, slug, coordinator, active, allProviders, artifactFiles);

  return runDir;
}
