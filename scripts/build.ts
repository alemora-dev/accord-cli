import { readFileSync, writeFileSync, chmodSync, mkdirSync } from 'node:fs';

const version = readFileSync('VERSION', 'utf-8').trim();

mkdirSync('dist', { recursive: true });

console.log('Building dist/accord.js...');

const proc = Bun.spawn([
  process.execPath, 'build',
  '--target', 'node',
  '--outfile', 'dist/accord.js',
  '--define', `__ACCORD_VERSION__="${version}"`,
  'src/main.ts',
], { stdout: 'inherit', stderr: 'inherit' });

const code = await proc.exited;
if (code !== 0) {
  console.error('Build failed');
  process.exit(1);
}

// Prepend shebang so the file is directly executable
const bundle = readFileSync('dist/accord.js', 'utf-8');
writeFileSync('dist/accord.js', '#!/usr/bin/env node\n' + bundle);
chmodSync('dist/accord.js', 0o755);

console.log(`  → dist/accord.js (v${version})`);
console.log('Build complete.');
