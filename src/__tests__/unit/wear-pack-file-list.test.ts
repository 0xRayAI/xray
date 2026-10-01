import { describe, expect, it } from 'vitest';
import { REQUIRED_PACK_PATHS } from '../../../scripts/foundry/assert-packed-dist-cli.mjs';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Cursor hook files 4.0.28 wrote into the project. Wear outside git skips these. */
const CURSOR_HOOK_FILES = [
  '.cursor/hooks.json',
  '.cursor/hooks/after-file-edit.sh',
  '.cursor/hooks/before-read-file.sh',
  '.cursor/hooks/before-shell-execution.sh',
  '.cursor/hooks/pre-compact.sh',
  '.cursor/hooks/pre-tool-use.sh',
  '.cursor/hooks/xray-cloud-hook.sh',
];

/** Hook snapshot wear writes on top of the 4.0.28 project list. */
const GIT_HOOK_SNAPSHOT = [
  '.xray/state/cursor-hook-wear/hooks.json.written',
  '.xray/state/cursor-hook-wear/meta.json',
];

function listProject(dir: string): string[] {
  const out: string[] = [];
  const walk = (cur: string) => {
    for (const name of readdirSync(cur)) {
      if (name === '.git') continue;
      const abs = path.join(cur, name);
      const rel = path.relative(dir, abs).split(path.sep).join('/');
      if (name === 'node_modules' && cur === dir) {
        const link = path.join(abs, '@0xray', 'repertoire');
        try {
          if (lstatSync(link).isSymbolicLink()) out.push('node_modules/@0xray/repertoire');
        } catch {
          // absent
        }
        continue;
      }
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) {
        const target = readlinkSync(abs);
        const absTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(abs), target);
        const shown = path.relative(dir, absTarget).split(path.sep).join('/');
        out.push(`${rel} -> ${shown}`);
        continue;
      }
      if (st.isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(dir);
  return out.filter((rel) => rel !== 'package.json' && rel !== 'package-lock.json').sort();
}

/** Consumer setup links the package dist and scripts. 4.0.28 did not. That pair is expected. */
function isRootSuitLink(rel: string): boolean {
  const name = rel.startsWith('dist -> ') ? 'dist' : rel.startsWith('scripts -> ') ? 'scripts' : '';
  return name !== '' && rel.includes(`/node_modules/0xray/${name}`);
}

function installAndSetup(dir: string, spec: string, git: boolean, home: string): string[] {
  mkdirSync(dir, { recursive: true });
  mkdirSync(home, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: 'acme', version: '1.0.0' })}\n`);
  if (git) execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    npm_config_cache: path.join(home, '.npm'),
    npm_config_fund: 'false',
    npm_config_audit: 'false',
    npm_config_update_notifier: 'false',
  };
  execFileSync('npm', ['install', spec, '--foreground-scripts', '--no-fund', '--no-audit'], {
    cwd: dir,
    env,
    stdio: 'pipe',
  });
  execFileSync('npx', ['--no-install', '0xray', 'setup'], {
    cwd: dir,
    env,
    stdio: 'pipe',
  });
  if (spec !== '0xray@4.0.28') {
    execFileSync('npx', ['--no-install', '0xray', 'wear'], {
      cwd: dir,
      env,
      stdio: 'pipe',
    });
  }
  return listProject(dir);
}

describe('packed tarball file list against 0xray@4.0.28', () => {
  it(
    'matches 4.0.28 minus cursor hooks outside git, and 4.0.28 plus hooks inside git',
    { timeout: 240000, retry: 0 },
    () => {
      const work = mkdtempSync(path.join(tmpdir(), 'xray-pack-gate-'));
      const packDir = path.join(work, 'pack');
      mkdirSync(packDir);
      try {
        execFileSync('npm', ['pack', '--pack-destination', packDir], {
          cwd: repoRoot,
          stdio: 'pipe',
        });
        const tarball = path.join(packDir, readdirSync(packDir).find((name) => name.endsWith('.tgz')) || '');
        expect(tarball.endsWith('.tgz')).toBe(true);

        const oldPlain = installAndSetup(
          path.join(work, 'old-plain'),
          '0xray@4.0.28',
          false,
          path.join(work, 'old-plain-home'),
        );
        const packedPlain = installAndSetup(
          path.join(work, 'new-plain'),
          tarball,
          false,
          path.join(work, 'new-plain-home'),
        );
        const oldGit = installAndSetup(
          path.join(work, 'old-git'),
          '0xray@4.0.28',
          true,
          path.join(work, 'old-git-home'),
        );
        const packedGit = installAndSetup(
          path.join(work, 'new-git'),
          tarball,
          true,
          path.join(work, 'new-git-home'),
        );

        const plainMissing = oldPlain.filter((rel) => !packedPlain.includes(rel) && !isRootSuitLink(rel));
        const plainExtra = packedPlain.filter((rel) => !oldPlain.includes(rel) && !isRootSuitLink(rel));
        expect(plainExtra).toEqual([]);
        expect(plainMissing).toEqual([...CURSOR_HOOK_FILES].sort());

        const expectedGit = [...new Set([...oldGit, ...CURSOR_HOOK_FILES, ...GIT_HOOK_SNAPSHOT])]
          .filter((rel) => !isRootSuitLink(rel))
          .sort();
        expect(packedGit.filter((rel) => !isRootSuitLink(rel))).toEqual(expectedGit);
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    },
  );
});

describe('goggles organ files are on the pack list', () => {
  it('names the pipeline and the plane map inside the package, not the consumer tree', () => {
    expect(REQUIRED_PACK_PATHS).toContain('dist/integrations/hooks/goggles-pipeline.mjs');
    expect(REQUIRED_PACK_PATHS).toContain('dist/integrations/hooks/goggles-planes.json');
    expect(REQUIRED_PACK_PATHS).toContain('dist/integrations/hooks/goggles-mcp.mjs');
    expect(REQUIRED_PACK_PATHS).toContain('scripts/mjs/run-goggles-mcp.mjs');
    expect(existsSync(joinPack('src/integrations/hooks/goggles-pipeline.mjs'))).toBe(true);
    expect(existsSync(joinPack('src/integrations/hooks/goggles-planes.json'))).toBe(true);
    expect(existsSync(joinPack('src/integrations/hooks/goggles-mcp.mjs'))).toBe(true);
    expect(existsSync(joinPack('scripts/mjs/run-goggles-mcp.mjs'))).toBe(true);
  });
});

function joinPack(rel: string): string {
  return path.join(repoRoot, rel);
}
