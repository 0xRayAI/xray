import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readSite(name: string): string {
  return readFileSync(join(root, 'site', name), 'utf8');
}

function pngSize(buf: Buffer): { width: number; height: number } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  expect([...buf.subarray(0, 8)]).toEqual(sig);
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('apex site', () => {
  it('claims 0xray.dev and ships the install line plus the four links', () => {
    expect(readSite('CNAME').trim()).toBe('0xray.dev');
    const page = readSite('index.html');
    expect(page).toContain('npm i -g 0xray');
    expect(page).toContain('https://docs.0xray.dev');
    expect(page).toContain('https://github.com/0xRayAI/xray');
    expect(page).toContain('https://www.npmjs.com/package/0xray');
    expect(page).toContain('https://bifrost.0xray.dev');
    expect(page).toContain('assets/apex.png');
    expect(page).not.toContain('logo.jpg');
  });

  it('uses a 1280x720 stamped plate and keeps the Pages workflow inside site/', () => {
    const plate = readFileSync(join(root, 'site', 'assets', 'apex.png'));
    expect(pngSize(plate)).toEqual({ width: 1280, height: 720 });
    const workflow = readSite('.github/workflows/pages.yml');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(readFileSync(join(root, '.github', 'workflows', 'deploy-docs.yml'), 'utf8')).toContain('docs-site/build');
  });
});
