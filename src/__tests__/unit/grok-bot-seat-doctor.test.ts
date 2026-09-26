import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bin = path.join(root, 'grok-bot', 'bin', 'grok-bot.js');
const {
  diagnoseSeat,
  formatDoctor,
  parseDoctorArgs,
  runDoctorCli,
  PLANT_URLS,
} = requireCjs(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
  diagnoseSeat: (opts?: { cwd?: string; home?: string; env?: Record<string, string> }) => {
    ok: boolean;
    cwd: string;
    seat: { name: string | null; version: string | null } | null;
    plant: {
      ok: boolean;
      mill: boolean;
      inspect: boolean;
      millFile: string | null;
      inspectFile: string | null;
      costume: boolean;
      inventoryPresent: boolean;
      suit: string | null;
    };
    repertoire: { status: string; detail?: string; name?: string; version?: string; signals?: number | null };
    ows: { present: boolean; path: string };
    house: { status: string; detail: string; file: string | null; via: string | null };
    next: string[];
    urls: { clearing: string };
  };
  formatDoctor: (report: { ok: boolean; next: string[] } & Record<string, unknown>) => string;
  parseDoctorArgs: (argv: string[]) => {
    command: string | null;
    cwd: string | null;
    home: string | null;
    json: boolean;
  };
  runDoctorCli: (
    argv: string[],
    io?: { stdout?: { write: (s: string) => void }; stderr?: { write: (s: string) => void }; kitRoot?: string },
  ) => number;
  PLANT_URLS: { clearing: string; clearingRail: string; suitUi: string };
};

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), 'grok-bot-doctor-'));
}

function writeSeat(dir: string, name = 'forge-suit'): void {
  writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name, version: '1.0.0', private: true }, null, 2)}\n`,
  );
}

function plantMillInspect(dir: string): void {
  for (const skill of ['mill', 'inspect']) {
    const dest = path.join(dir, '.opencode', 'skills', skill);
    mkdirSync(dest, { recursive: true });
    writeFileSync(path.join(dest, 'SKILL.md'), `# ${skill}\n`);
  }
}

function runBin(args: string[], cwd: string, env?: Record<string, string>) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: 'utf8',
    env: env ? { ...process.env, ...env } : process.env,
  });
}

describe('grok-bot seat doctor — parse', () => {
  it('treats doctor and ready as the same command', () => {
    expect(parseDoctorArgs(['doctor', '--json']).command).toBe('doctor');
    expect(parseDoctorArgs(['ready', '--cwd', '/tmp/seat']).command).toBe('ready');
    expect(parseDoctorArgs(['ready', '--cwd', '/tmp/seat']).cwd).toBe('/tmp/seat');
  });

  it('rejects unknown flags', () => {
    expect(() => parseDoctorArgs(['doctor', '--go'])).toThrow(/unknown flag/);
  });
});

describe('grok-bot seat doctor — diagnose', () => {
  it('fails a directory with no package.json', () => {
    const dir = scratch();
    try {
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.ok).toBe(false);
      expect(report.seat).toBeNull();
      expect(report.plant.mill).toBe(false);
      expect(report.next.join('\n')).toMatch(/npx groover-hangar/);
      expect(report.next.join('\n')).toMatch(/clearing — never xray-clearing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails a seat without mill+inspect and still prints hangar/Clearing next steps', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.ok).toBe(false);
      expect(report.seat?.name).toBe('forge-suit');
      expect(report.plant.ok).toBe(false);
      const text = formatDoctor(report);
      expect(text).toMatch(/Plant: FAIL/);
      expect(text).toContain(PLANT_URLS.clearing);
      expect(text).toMatch(/npx groover-hangar/);
      expect(text).toMatch(/Do not mill-plant Clearing/);
      expect(text).toMatch(/never xray-clearing/);
      expect(text).toMatch(/OWS pay: miss/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when mill+inspect SKILL.md are fastened', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      mkdirSync(path.join(dir, '.ows'));
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.ok).toBe(true);
      expect(report.plant.mill).toBe(true);
      expect(report.plant.inspect).toBe(true);
      expect(report.ows.present).toBe(true);
      expect(report.repertoire.status).toBe('miss');
      expect(formatDoctor(report)).toMatch(/Plant: PASS/);
      expect(formatDoctor(report)).toMatch(/Repertoire: miss/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes from foundry-inventory millPlant even without skill files', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      mkdirSync(path.join(dir, '.xray'), { recursive: true });
      writeFileSync(
        path.join(dir, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({
          suit: 'fastened',
          dna: 'abc',
          millPlant: { skills: ['mill', 'inspect'] },
        })}\n`,
      );
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.ok).toBe(true);
      expect(report.plant.suit).toBe('fastened');
      expect(report.plant.inventoryPresent).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports repertoire on when the package and signals exist', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      const rep = path.join(dir, 'node_modules', '@0xray', 'repertoire');
      mkdirSync(path.join(rep, 'data'), { recursive: true });
      writeFileSync(
        path.join(rep, 'package.json'),
        `${JSON.stringify({ name: '@0xray/repertoire', version: '0.2.0' })}\n`,
      );
      writeFileSync(
        path.join(rep, 'data', 'curated_signals.json'),
        `${JSON.stringify({ signals: [{ name: 'a' }, { name: 'b' }] })}\n`,
      );
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.repertoire.status).toBe('on');
      expect(report.repertoire.version).toBe('0.2.0');
      expect(report.repertoire.signals).toBe(2);
      expect(formatDoctor(report)).toMatch(/Repertoire: on — @0xray\/repertoire@0.2.0 — 2 signals/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags costume true without treating it as mill plant', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      writeFileSync(path.join(dir, 'foundry.json'), `${JSON.stringify({ costume: true })}\n`);
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.ok).toBe(true);
      expect(report.plant.costume).toBe(true);
      expect(formatDoctor(report)).toMatch(/costume: true/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('grok-bot seat doctor — CLI', () => {
  it('prints usage with no args (exit 0)', () => {
    const r = runBin([], root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/doctor \| ready/);
    expect(r.stdout).toMatch(/fasten suit/);
  });

  it('ready on a fastened seat exits 0 and prints next steps', () => {
    const dir = scratch();
    try {
      writeSeat(dir, 'critic-suit');
      plantMillInspect(dir);
      const r = runBin(['ready', '--cwd', dir, '--home', dir], dir);
      expect(r.status, r.stdout + r.stderr).toBe(0);
      expect(r.stdout).toMatch(/Plant: PASS/);
      expect(r.stdout).toContain(PLANT_URLS.clearing);
      expect(r.stdout).toMatch(/npx groover-hangar/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('doctor --json on an unfastened seat exits 1', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      const r = runBin(['doctor', '--cwd', dir, '--home', dir, '--json'], dir);
      expect(r.status).toBe(1);
      const report = JSON.parse(r.stdout) as { ok: boolean; next: string[]; urls: { clearing: string } };
      expect(report.ok).toBe(false);
      expect(report.urls.clearing).toBe(PLANT_URLS.clearing);
      expect(report.next.some((s) => s.includes('never xray-clearing'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns when house/HOUSE.md is missing and does not fail the plant', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      const report = diagnoseSeat({ cwd: dir, home: dir, env: {} });
      expect(report.house.status).toBe('warn');
      expect(report.house.detail).toBe('no house/HOUSE.md, run setup-house');
      expect(report.ok).toBe(true);
      expect(formatDoctor(report)).toMatch(/House: WARN — no house\/HOUSE\.md, run setup-house/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when HOUSE.md still has unfilled example lines', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      mkdirSync(path.join(dir, 'house'));
      writeFileSync(
        path.join(dir, 'house', 'HOUSE.md'),
        '# House\n\n## Owner\n(example) Ada — the human.\n',
      );
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.house.status).toBe('fail');
      expect(report.ok).toBe(false);
      expect(formatDoctor(report)).toMatch(/House: FAIL — .+\/house\/HOUSE\.md \(via walk-up\) — HOUSE.md still has unfilled example lines/);
      const r = runBin(['doctor', '--cwd', dir, '--home', dir], dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/no house\/HOUSE\.md, run setup-house|unfilled example lines/);
      expect(r.stdout).toMatch(/House: FAIL/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when seats are renamed and example lines are gone', () => {
    const dir = scratch();
    try {
      writeSeat(dir, 'anvil-seat');
      plantMillInspect(dir);
      mkdirSync(path.join(dir, 'house'));
      writeFileSync(
        path.join(dir, 'house', 'HOUSE.md'),
        [
          '# House',
          '',
          '## Owner',
          'Ada.',
          '',
          '## Seats',
          '- Coordinator: north. Never deploys, publishes, or spends.',
          '- Implementer and publisher: anvil.',
          '- Reviewer: lens. Never merges.',
          '- Public-posts specialist: quill. Never invents the words.',
          '- Listings: peg.',
          '- Audio: reed.',
          '',
          '## Public voice',
          '@example',
          '',
          '## Allowed',
          'git push to org/app',
          '',
          '## Ask first',
          'Package publish.',
          '',
          '## Board',
          'house/WAVEBOARD.md and house/ATTENTION_STATE.md',
          '',
        ].join('\n'),
      );
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.house.status).toBe('pass');
      expect(report.ok).toBe(true);
      expect(formatDoctor(report)).toMatch(/House: PASS — .+\/house\/HOUSE\.md \(via walk-up\)/);
      expect(formatDoctor(report)).toMatch(/Seat: anvil-seat@1\.0\.0/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes the house check when example lines are filled in', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      mkdirSync(path.join(dir, 'house'));
      writeFileSync(path.join(dir, 'house', 'HOUSE.md'), '# House\n\n## Owner\nAda.\n');
      const report = diagnoseSeat({ cwd: dir, home: dir });
      expect(report.house.status).toBe('pass');
      expect(report.ok).toBe(true);
      expect(formatDoctor(report)).toMatch(/House: PASS — .+\/house\/HOUSE\.md \(via walk-up\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not fail on a mid-line (example)', () => {
    const dir = scratch();
    try {
      writeSeat(dir);
      plantMillInspect(dir);
      mkdirSync(path.join(dir, 'house'));
      writeFileSync(
        path.join(dir, 'house', 'HOUSE.md'),
        '# House\n\nNames are not an (example) of a seat.\n',
      );
      const report = diagnoseSeat({ cwd: dir, home: dir, env: {} });
      expect(report.house.status).toBe('pass');
      expect(report.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('house init copies templates into an empty directory', () => {
    const dir = scratch();
    try {
      const r = runBin(['house', 'init', '--dir', dir], dir);
      expect(r.status).toBe(0);
      const house = path.join(dir, 'house');
      const names = readdirSync(house).sort();
      expect(names).toEqual(readdirSync(path.join(root, 'grok-bot', 'templates', 'house')).sort());
      expect(readFileSync(path.join(house, 'HOUSE.md'), 'utf8')).toBe(
        readFileSync(path.join(root, 'grok-bot', 'templates', 'house', 'HOUSE.md'), 'utf8'),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a second house init refuses and leaves files unchanged', () => {
    const dir = scratch();
    try {
      expect(runBin(['house', 'init'], dir).status).toBe(0);
      const houseFile = path.join(dir, 'house', 'HOUSE.md');
      writeFileSync(houseFile, 'filled by owner\n');
      const before = readFileSync(houseFile, 'utf8');
      const again = runBin(['house', 'init'], dir);
      expect(again.status).not.toBe(0);
      expect(again.stdout).toMatch(/refusing to overwrite/);
      expect(readFileSync(houseFile, 'utf8')).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('doctor from a nested folder finds the house by walking up', () => {
    const dir = scratch();
    try {
      mkdirSync(path.join(dir, 'house'), { recursive: true });
      writeFileSync(path.join(dir, 'house', 'HOUSE.md'), '# House\n\n## Owner\nAda.\n');
      const nested = path.join(dir, 'a', 'b');
      mkdirSync(nested, { recursive: true });
      const report = diagnoseSeat({ cwd: nested, env: {} });
      expect(report.house.status).toBe('pass');
      expect(report.house.via).toBe('walk-up');
      expect(report.house.file).toBe(path.join(dir, 'house', 'HOUSE.md'));
      expect(formatDoctor(report)).toMatch(/House: PASS — .+ \(via walk-up\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GROK_BOT_HOUSE finds the house and beats walk-up', () => {
    const walked = scratch();
    const pointed = scratch();
    try {
      mkdirSync(path.join(walked, 'house'), { recursive: true });
      writeFileSync(path.join(walked, 'house', 'HOUSE.md'), '# House\n\nwalked\n');
      mkdirSync(pointed, { recursive: true });
      writeFileSync(path.join(pointed, 'HOUSE.md'), '# House\n\npointed\n');
      const report = diagnoseSeat({
        cwd: walked,
        env: { GROK_BOT_HOUSE: pointed },
      });
      expect(report.house.status).toBe('pass');
      expect(report.house.via).toBe('GROK_BOT_HOUSE');
      expect(report.house.file).toBe(path.join(pointed, 'HOUSE.md'));
      expect(formatDoctor(report)).toContain(`House: PASS — ${path.join(pointed, 'HOUSE.md')} (via GROK_BOT_HOUSE)`);
      const missing = diagnoseSeat({
        cwd: walked,
        env: { GROK_BOT_HOUSE: path.join(pointed, 'nope') },
      });
      expect(missing.house.status).toBe('warn');
      expect(missing.house.file).toBeNull();
      expect(missing.house.detail).toMatch(/GROK_BOT_HOUSE is set but HOUSE.md is missing/);
    } finally {
      rmSync(walked, { recursive: true, force: true });
      rmSync(pointed, { recursive: true, force: true });
    }
  });

  it('init from the packed tarball then doctor finds that house', () => {
    const packDir = scratch();
    const app = scratch();
    try {
      const packed = spawnSync('npm', ['pack', '--pack-destination', packDir], {
        cwd: path.join(root, 'grok-bot'),
        encoding: 'utf8',
      });
      expect(packed.status).toBe(0);
      const tgz = readdirSync(packDir).find((name) => name.endsWith('.tgz'));
      expect(tgz).toBeTruthy();
      const installed = spawnSync('npm', ['install', path.join(packDir, tgz as string)], {
        cwd: app,
        encoding: 'utf8',
      });
      expect(installed.status).toBe(0);
      const packedBin = path.join(app, 'node_modules', '@0xray', 'grok-bot', 'bin', 'grok-bot.js');
      expect(existsSync(packedBin)).toBe(true);
      const init = spawnSync(process.execPath, [packedBin, 'house', 'init'], {
        cwd: app,
        encoding: 'utf8',
        env: { ...process.env, GROK_BOT_HOUSE: '' },
      });
      expect(init.status).toBe(0);
      expect(init.stdout).toMatch(/copied templates\/house/);
      expect(existsSync(path.join(app, 'house', 'HOUSE.md'))).toBe(true);
      const nested = path.join(app, 'nested', 'seat');
      mkdirSync(nested, { recursive: true });
      const doctor = spawnSync(process.execPath, [packedBin, 'doctor'], {
        cwd: nested,
        encoding: 'utf8',
        env: { ...process.env, GROK_BOT_HOUSE: '' },
      });
      expect(doctor.stdout).toContain(path.join(app, 'house', 'HOUSE.md'));
      expect(doctor.stdout).toMatch(/\(via walk-up\)/);
    } finally {
      rmSync(packDir, { recursive: true, force: true });
      rmSync(app, { recursive: true, force: true });
    }
  }, 60000);

  it('unknown flag exits 2', () => {
    const chunks: string[] = [];
    const code = runDoctorCli(['doctor', '--mill-go'], {
      stdout: { write: (s: string) => { chunks.push(s); } },
      stderr: { write: (s: string) => { chunks.push(s); } },
      kitRoot: path.join(root, 'grok-bot'),
    });
    expect(code).toBe(2);
    expect(chunks.join('')).toMatch(/unknown flag/);
  });
});
