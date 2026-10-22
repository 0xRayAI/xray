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
  it('claims 0xray.dev and ships live plate text plus the install line', () => {
    expect(readSite('CNAME').trim()).toBe('0xray.dev');
    const page = readSite('index.html');
    expect(page).toContain('npm i -g 0xray');
    expect(page).toContain('https://docs.0xray.dev');
    expect(page).toContain('https://github.com/0xRayAI/xray');
    expect(page).toContain('https://www.npmjs.com/package/0xray');
    expect(page).toContain('https://bifrost.0xray.dev');
    expect(page).toContain('kit/tokens.css');
    expect(page).toContain('kit/plate.css');
    expect(page).toContain('kit/stamp.js');
    expect(page).toContain('>A power suit for AI agents</h1>');
    expect(page).toContain('assets/suit.webp');
    expect(page).toContain('assets/suit.png');
    expect(page).toContain('0xRay v4.0 suit, hand raised');
    expect(page).toContain('Survive compaction');
    expect(page).toContain('Build foundries');
    expect(page).toContain('Monitor the swarm');
    expect(page).toContain('Your agent forgets the job when the session or context window ends');
    expect(page).toContain('A suit your agent wears. Keeps laws, memory, and the job when the window closes');
    expect(page).toContain('GROK, OPENCODE, HERMES, OPENCLAW, CURSOR, GROK BOT');
    expect(page).toContain('https://0xray.dev/assets/readme-hero.jpg');
    expect(page).not.toContain('assets/apex.png');
    expect(page).not.toContain('logo.jpg');
    expect(page).not.toContain('Inter');
    const hero = readFileSync(join(root, 'site', 'assets', 'readme-hero.jpg'));
    expect([...hero.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    const css = readSite('kit/tokens.css');
    expect(css).toContain('assets/fonts/BlackOpsOne-Regular.ttf');
    expect(css).toContain('assets/fonts/ChakraPetch-Bold.ttf');
    expect(css).toContain('assets/fonts/BarlowCondensed-Bold.ttf');
    expect(css).toContain('--bg: #04060c');
    expect(css).toContain('--glow: #ffd166');
    expect(css).toContain('--cyan: #5ad6de');
    const plateCss = readSite('kit/plate.css');
    expect(plateCss).toContain('text-wave');
    expect(plateCss).toContain('nm-roll');
    expect(plateCss).toContain('width: 1056px');
    expect(plateCss).toContain('grid-template-columns: 232px 824px');
    const stampJs = readSite('kit/stamp.js');
    expect(stampJs).toContain('document.documentElement.clientWidth');
    expect(stampJs).toContain('720 * scale');
    expect(stampJs).toContain("marginLeft = 'auto'");
    expect(plateCss).toContain('margin-left: auto');
    expect(plateCss).toContain('margin-right: auto');
    expect(plateCss).toContain('height: calc(100vw * 720 / 1280)');
    expect(plateCss).not.toContain('zoom:');
    expect(plateCss).toContain('../assets/console.jpg');
    expect(plateCss).toContain('.panel');
    const frame = readSite('kit/parts/frame.svg');
    expect(frame).toContain('stroke-width="16"');
    expect(frame).toContain('#242628');
    expect(frame).not.toContain('palette:');
    expect(readFileSync(join(root, 'site', 'assets', 'fonts', 'BarlowCondensed-Bold.ttf')).length).toBeGreaterThan(1000);
    const logo = readFileSync(join(root, 'site', 'kit', 'logo.png'));
    expect(pngSize(logo).width).toBe(420);
    const skill = readFileSync(join(root, '.agents', 'skills', 'live-plate', 'SKILL.md'), 'utf8');
    expect(skill).toContain('ab36db743');
    expect(skill).toContain('house/live');
    expect(skill).toContain('site/kit/tokens.css');
    expect(skill).toContain('## Teardown of site/assets/apex.png');
    expect(skill).toContain('1056px');
    expect(skill).toContain('(66, 55)');
  });

  it('keeps the 1280x720 raster twin and the Pages workflow inside site/', () => {
    const suitWebp = readFileSync(join(root, 'site', 'assets', 'suit.webp'));
    expect(suitWebp.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(suitWebp.subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(suitWebp.length).toBeLessThan(400000);
    const suitPng = readFileSync(join(root, 'site', 'assets', 'suit.png'));
    expect(pngSize(suitPng).width).toBe(1000);
    const canon = readFileSync(join(root, 'FINAL-REFS', 'bots', '00-CANONICAL-suit-grok-imagine-blaze-pick.jpg'));
    expect([...canon.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(canon.length).toBeLessThan(800000);
    const skillSuit = readFileSync(join(root, 'grok-bot', 'skills', 'draw-me-a-suit', 'SKILL.md'), 'utf8');
    expect(skillSuit).toContain('FINAL-REFS/bots/00-CANONICAL-suit-grok-imagine-blaze-pick.jpg');
    expect(skillSuit).toContain('FINAL-REFS/logos/00-0xray-stamp-FINAL.png');
    const plate = readFileSync(join(root, 'site', 'assets', 'apex.png'));
    expect(pngSize(plate)).toEqual({ width: 1280, height: 720 });
    const workflow = readSite('.github/workflows/pages.yml');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(readFileSync(join(root, '.github', 'workflows', 'deploy-docs.yml'), 'utf8')).toContain('docs-site/build');
  });
});
