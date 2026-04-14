import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Injected at bundle time via: bun build --define '__ACCORD_VERSION__="x.y.z"'
// Falls back to reading VERSION file in dev/test (unbundled) mode.
declare const __ACCORD_VERSION__: string;

function readVersion(): string {
  try {
    return __ACCORD_VERSION__;
  } catch {
    const dir = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(dir, '../VERSION'), 'utf-8').trim();
  }
}

export const VERSION = readVersion();
