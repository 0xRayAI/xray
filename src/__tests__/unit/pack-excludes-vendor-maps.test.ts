import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

type PackFile = { path?: string };

/** npm-packlist drops the root .npmignore when files[] is set. The bang entry is inverted to an exclude and must follow the directory whitelist. */
function packedPaths(): string[] {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const start = out.search(/[\[{]/);
  if (start < 0) {
    throw new Error('npm pack --json produced no JSON');
  }
  const parsed: unknown = JSON.parse(out.slice(start));
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry !== 'object' || !('files' in entry)) {
    throw new Error('npm pack --json has no files');
  }
  const files = (entry as { files?: unknown }).files;
  if (!Array.isArray(files)) {
    throw new Error('npm pack --json files is not an array');
  }
  return files
    .map((file: unknown) => {
      if (typeof file === 'string') return file;
      if (file && typeof file === 'object' && 'path' in file) {
        const listed = (file as PackFile).path;
        return typeof listed === 'string' ? listed : '';
      }
      return '';
    })
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/^package\//, ''));
}

describe('vendor source maps stay out of the npm pack', () => {
  it('keeps repertoire runtime js and omits every vendor map', () => {
    const listed = packedPaths();
    const vendorMaps = listed.filter((item) => item.startsWith('vendor/') && item.endsWith('.map'));
    expect(vendorMaps).toEqual([]);
    expect(listed).toContain('vendor/@0xray/repertoire/dist/index.js');
    expect(listed).toContain('vendor/@0xray/repertoire/dist/index.d.ts');
    expect(listed).not.toContain('vendor/@0xray/repertoire/dist/index.js.map');
    expect(listed).not.toContain('vendor/@0xray/repertoire/dist/index.d.ts.map');
    expect(listed).toContain('scripts/mjs/run-grok-hook.mjs');
  }, 120000);
});
