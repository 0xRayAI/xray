import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');
const gogglesScript = path.join(repoRoot, 'src/integrations/hooks/goggles-pipeline.mjs');
const version = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version as string;
const fixtures = path.join(repoRoot, 'src/__tests__/fixtures/shipped-skills');
const pinned = JSON.parse(
  readFileSync(path.join(repoRoot, 'scripts/foundry/shipped-skill-blobs.json'), 'utf8'),
) as { skills: Record<string, { blob: string; since: string }[]> };
const skillDirs = [
  '.opencode/skills',
  '.grok/plugins/0xray/skills',
  '.hermes/plugins/xray-hermes/skills',
  '.openclaw/skills',
];
const catalog = readdirSync(path.join(repoRoot, 'src/skills')).filter((name) =>
  existsSync(path.join(repoRoot, 'src/skills', name, 'SKILL.md')),
);

function blobId(bytes: Buffer): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function fixtureFor(name: string, blob: string): string {
  const file = readdirSync(path.join(fixtures, name)).find((f) => f.includes(blob.slice(0, 9)));
  if (!file) throw new Error(`missing fixture ${name} ${blob}`);
  return path.join(fixtures, name, file);
}

/** A non-git suit wearing all catalog skills, orchestrator replaced by `orchestrator`. */
function plantSoundSuit(orchestrator: string, plant = 'sound') {
  const project = mkdtempSync(path.join(tmpdir(), 'xray-shipped-blob-'));
  writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: `${plant}-seat`, private: true })}\n`);
  writeFileSync(path.join(project, 'foundry.json'), `${JSON.stringify({ plant }, null, 2)}\n`);
  mkdirSync(path.join(project, '.xray', 'state'), { recursive: true });
  writeFileSync(
    path.join(project, '.xray', 'features.json'),
    `${JSON.stringify({ plant, goggles: { enabled: true } }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(project, '.xray', 'state', 'goggles-plane.json'),
    `${JSON.stringify({ plane: 'dev', card: 'dev' })}\n`,
  );
  for (const rel of skillDirs) {
    for (const name of catalog) {
      const dest = path.join(project, rel, name, 'SKILL.md');
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(
        name === 'orchestrator' ? orchestrator : path.join(repoRoot, 'src/skills', name, 'SKILL.md'),
        dest,
      );
    }
  }
  const dest = path.join(project, 'node_modules', '0xray');
  mkdirSync(path.dirname(dest), { recursive: true });
  symlinkSync(repoRoot, dest, 'dir');
  return project;
}

function wearAndProve(orchestrator: string, label: string) {
  const project = plantSoundSuit(orchestrator);
  const home = mkdtempSync(path.join(tmpdir(), 'xray-shipped-home-'));
  const machine = mkdtempSync(path.join(tmpdir(), 'xray-shipped-machine-'));
  try {
    const ran = spawnSync(process.execPath, [wearScript, project], {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home, FOUNDRY_MACHINE_HOME: machine },
    });
    expect(ran.status, `${label}\n${ran.stdout}\n${ran.stderr}`).toBe(0);
    expect(ran.stderr, label).not.toContain('costume dump');
    for (const rel of skillDirs) {
      expect(existsSync(path.join(project, rel, 'orchestrator', 'SKILL.md')), `${label} ${rel}`).toBe(false);
    }
    for (const name of ['sound', 'sound-inspect', 'sound-mixer']) {
      expect(existsSync(path.join(project, '.opencode/skills', name, 'SKILL.md')), `${label} ${name}`).toBe(true);
    }
    const inventory = JSON.parse(readFileSync(path.join(project, '.xray', 'foundry-inventory.json'), 'utf8'));
    expect(JSON.stringify(inventory), label).toContain(version);
    const card = execFileSync(process.execPath, [gogglesScript], {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, GOGGLES_ROOT: project },
    });
    expect(card, label).not.toMatch(/^Plane: dev$/m);
    expect(card, label).toContain('Skills: sound, sound-inspect, sound-mixer');
    expect(card, label).toContain(`Worn: sound ${version}`);
  } finally {
    for (const dir of [project, home, machine]) rmSync(dir, { recursive: true, force: true });
  }
}

/** Mill wear: every project skill dir ends on `expected` bytes for orchestrator. */
function wearMillAndProve(orchestrator: string, expected: string, label: string, dirs = skillDirs) {
  const project = plantSoundSuit(orchestrator, 'mill');
  const home = mkdtempSync(path.join(tmpdir(), 'xray-shipped-home-'));
  const machine = mkdtempSync(path.join(tmpdir(), 'xray-shipped-machine-'));
  try {
    const ran = spawnSync(process.execPath, [wearScript, project], {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home, FOUNDRY_MACHINE_HOME: machine },
    });
    expect(ran.status, `${label}\n${ran.stdout}\n${ran.stderr}`).toBe(0);
    const want = blobId(readFileSync(expected));
    for (const rel of dirs) {
      const worn = readFileSync(path.join(project, rel, 'orchestrator', 'SKILL.md'));
      expect(blobId(worn), `${label} ${rel}`).toBe(want);
    }
  } finally {
    for (const dir of [project, home, machine]) rmSync(dir, { recursive: true, force: true });
  }
}

describe('wear strips catalog skill bodies shipped since v4.0.0', () => {
  it('pins 13 orchestrator, 2 hermes-agent and 2 storyteller blobs, each matching its fixture', () => {
    expect(catalog.length).toBe(45);
    expect(pinned.skills.orchestrator).toHaveLength(13);
    expect(pinned.skills['hermes-agent']).toHaveLength(2);
    expect(pinned.skills.storyteller).toHaveLength(2);
    expect(pinned.skills.orchestrator.map((e) => e.since)).toContain('4.0.32');
    expect(pinned.skills.orchestrator.map((e) => e.blob)).toContain('13e539a824d3632b36e60bdf37e436800a70eabb');
    for (const [name, list] of Object.entries(pinned.skills)) {
      for (const { blob } of list) expect(blobId(readFileSync(fixtureFor(name, blob)))).toBe(blob);
    }
  });

  it('wears a sound plant over each of the 13 shipped orchestrator bodies', () => {
    for (const { blob, since } of pinned.skills.orchestrator) {
      wearAndProve(fixtureFor('orchestrator', blob), `orchestrator ${since} ${blob}`);
    }
  }, 600000);

  it('wears a sound plant over the current orchestrator bytes', () => {
    wearAndProve(path.join(repoRoot, 'src/skills/orchestrator/SKILL.md'), 'current');
  }, 120000);

  it('refreshes each shipped orchestrator body in every skill dir of a mill suit', () => {
    const current = path.join(repoRoot, 'src/skills/orchestrator/SKILL.md');
    for (const { blob, since } of pinned.skills.orchestrator) {
      wearMillAndProve(fixtureFor('orchestrator', blob), current, `mill ${since} ${blob}`);
    }
  }, 600000);

  // Bridges recopy .opencode/.grok/.hermes; .openclaw/skills is touched only by the refresh pass.
  it("keeps a mill seat's own orchestrator text in .openclaw/skills", () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-own-skill-'));
    const own = path.join(dir, 'SKILL.md');
    writeFileSync(own, '---\nname: orchestrator\ndescription: seat own\n---\n# Mine\n');
    try {
      wearMillAndProve(own, own, 'mill own text', ['.openclaw/skills']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});
