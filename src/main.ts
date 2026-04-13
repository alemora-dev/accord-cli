import { fail } from './common.ts';
import { loadConfig } from './config.ts';
import { runAccord } from './pipeline.ts';
import { VERSION } from './version.ts';

function printUsage(): void {
  process.stdout.write(`Usage: accord [--version] [--llms <role-list>] [--team <preset>] [--coordinator <provider>] [--providers <csv>] [--output <dir>] "prompt"

Default providers: codex,claude,gemini
Default coordinator: codex
Version: ${VERSION}
Team presets: security, architecture, performance, debug

Examples:
  accord "Recent AI coding agents"
  accord --version
  accord --team security "Review the new auth flow"
  accord --llms codex:coordinator,claude:debater,gemini:debater "State of local-first coding tools"
  accord --providers codex,gemini "State of local-first coding tools"
  accord --coordinator gemini --output ./runs "Best browser automation workflows"
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let coordinator = 'codex';
  let coordinatorExplicit = false;
  let providersCSV = process.env.ACCORD_PROVIDERS ?? 'codex,claude,gemini';
  let llmsSpec = '';
  let outputRoot = 'runs';
  let runDir = '';
  let customSlug = '';
  let skipResearch = false;
  let skipSynthesis = false;
  let team = '';
  let topic = '';

  // Load .accordrc defaults
  const configFile = process.env.ACCORD_CONFIG_FILE;
  const configLlms = await loadConfig(configFile);
  if (configLlms) llmsSpec = configLlms;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--coordinator':
        if (i + 1 >= args.length) fail('--coordinator requires a value');
        coordinator = args[++i];
        coordinatorExplicit = true;
        break;
      case '--providers':
        if (i + 1 >= args.length) fail('--providers requires a value');
        providersCSV = args[++i];
        break;
      case '--llms':
        if (i + 1 >= args.length) fail('--llms requires a value');
        llmsSpec = args[++i];
        break;
      case '--output':
        if (i + 1 >= args.length) fail('--output requires a value');
        outputRoot = args[++i];
        break;
      case '--run-dir':
        if (i + 1 >= args.length) fail('--run-dir requires a value');
        runDir = args[++i];
        break;
      case '--slug':
        if (i + 1 >= args.length) fail('--slug requires a value');
        customSlug = args[++i];
        break;
      case '--team':
        if (i + 1 >= args.length) fail('--team requires a value');
        team = args[++i];
        break;
      case '--skip-research':
        skipResearch = true;
        break;
      case '--skip-synthesis':
        skipSynthesis = true;
        break;
      case '--version':
        process.stdout.write(`${VERSION}\n`);
        process.exit(0);
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
      case '--':
        topic = args.slice(i + 1).join(' ');
        i = args.length;
        break;
      default:
        if (arg.startsWith('-')) fail(`Unknown option: ${arg}`);
        topic = topic ? `${topic} ${arg}` : arg;
    }
    i++;
  }

  if (!topic) {
    printUsage();
    process.exit(1);
  }

  const outDir = await runAccord({
    topic,
    llmsSpec: llmsSpec || undefined,
    coordinator,
    coordinatorExplicit,
    providersCSV,
    outputRoot,
    runDir: runDir || undefined,
    customSlug: customSlug || undefined,
    skipResearch,
    skipSynthesis,
    team: team || undefined,
  });

  process.stdout.write(`${outDir}\n`);
}

main().catch(err => {
  process.stderr.write(`[accord] ${err.message ?? err}\n`);
  process.exit(1);
});
