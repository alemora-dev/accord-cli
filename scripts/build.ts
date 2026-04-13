import { mkdirSync } from 'node:fs';

const TARGETS = [
  { bun: 'bun-darwin-arm64', output: 'dist/accord-darwin-arm64' },
  { bun: 'bun-darwin-x64', output: 'dist/accord-darwin-x64' },
  { bun: 'bun-linux-x64', output: 'dist/accord-linux-x64' },
  { bun: 'bun-linux-arm64', output: 'dist/accord-linux-arm64' },
];

mkdirSync('dist', { recursive: true });

for (const { bun: target, output } of TARGETS) {
  console.log(`Building ${output}...`);
  const proc = Bun.spawn([
    process.execPath, 'build', '--compile',
    '--target', target,
    '--outfile', output,
    'src/main.ts',
  ], { stdout: 'inherit', stderr: 'inherit' });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Build failed for ${target}`);
    process.exit(1);
  }
  console.log(`  → ${output}`);
}

console.log('Build complete.');
