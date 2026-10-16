import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {
  resolveVendoredRepertoire,
  wearVendoredRepertoire,
  hasFileProtocolDependency,
} = require(path.join(root, 'scripts/node/wear-vendored-repertoire.cjs')) as {
  resolveVendoredRepertoire: (packageRoot: string) => string | null;
  wearVendoredRepertoire: (
    packageRoot: string,
    targetDir: string,
    log?: (...args: unknown[]) => void,
  ) => { worn: string[]; vendor: string | null };
  hasFileProtocolDependency: (pkg: { dependencies?: Record<string, string> }) => boolean;
};

describe('wear-vendored-repertoire', () => {
  it('resolves the factory organ from the exo vendor tree', () => {
    const vendor = resolveVendoredRepertoire(root);
    expect(vendor).toBe(path.join(root, 'vendor/@0xray/repertoire'));
  });

  it('wears vendor into consumer and package node_modules without a consumer vendor/ tree', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), '0xray-wear-rep-'));
    const packageRoot = path.join(tmp, 'node_modules', '0xray');
    const targetDir = tmp;
    const vendor = path.join(packageRoot, 'vendor', '@0xray', 'repertoire');
    mkdirSync(vendor, { recursive: true });
    writeFileSync(
      path.join(vendor, 'package.json'),
      JSON.stringify({ name: '@0xray/repertoire', version: '0.2.0' }),
    );
    try {
      const result = wearVendoredRepertoire(packageRoot, targetDir);
      expect(result.vendor).toBe(vendor);
      const consumerDest = path.join(targetDir, 'node_modules', '@0xray', 'repertoire');
      const nestedDest = path.join(packageRoot, 'node_modules', '@0xray', 'repertoire');
      expect(existsSync(path.join(consumerDest, 'package.json'))).toBe(true);
      expect(existsSync(path.join(nestedDest, 'package.json'))).toBe(true);
      expect(realpathSync(consumerDest)).toBe(realpathSync(vendor));
      expect(existsSync(path.join(targetDir, 'vendor'))).toBe(false);
      const worn = JSON.parse(readFileSync(path.join(consumerDest, 'package.json'), 'utf8')) as {
        name: string;
      };
      expect(worn.name).toBe('@0xray/repertoire');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('replaces an older leftover with the vendored copy', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), '0xray-wear-older-'));
    const packageRoot = path.join(tmp, 'pkg');
    const vendor = path.join(packageRoot, 'vendor', '@0xray', 'repertoire');
    const existing = path.join(packageRoot, 'node_modules', '@0xray', 'repertoire');
    mkdirSync(vendor, { recursive: true });
    mkdirSync(existing, { recursive: true });
    writeFileSync(
      path.join(vendor, 'package.json'),
      JSON.stringify({ name: '@0xray/repertoire', version: '0.2.5' }),
    );
    writeFileSync(
      path.join(existing, 'package.json'),
      JSON.stringify({ name: '@0xray/repertoire', version: '0.2.2' }),
    );
    try {
      wearVendoredRepertoire(packageRoot, packageRoot);
      const worn = JSON.parse(readFileSync(path.join(existing, 'package.json'), 'utf8')) as {
        version?: string;
      };
      expect(worn.version).toBe('0.2.5');
      expect(realpathSync(existing)).toBe(realpathSync(vendor));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('does not clobber a different usable @0xray/repertoire install', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), '0xray-wear-keep-'));
    const packageRoot = path.join(tmp, 'pkg');
    const vendor = path.join(packageRoot, 'vendor', '@0xray', 'repertoire');
    const existing = path.join(packageRoot, 'node_modules', '@0xray', 'repertoire');
    mkdirSync(vendor, { recursive: true });
    mkdirSync(existing, { recursive: true });
    writeFileSync(path.join(vendor, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
    writeFileSync(
      path.join(existing, 'package.json'),
      JSON.stringify({ name: '@0xray/repertoire', version: '9.9.9' }),
    );
    try {
      wearVendoredRepertoire(packageRoot, packageRoot);
      const kept = JSON.parse(readFileSync(path.join(existing, 'package.json'), 'utf8')) as {
        version?: string;
      };
      expect(kept.version).toBe('9.9.9');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('detects file: protocol dependencies', () => {
    expect(
      hasFileProtocolDependency({
        dependencies: { '@0xray/repertoire': 'file:./vendor/@0xray/repertoire' },
      }),
    ).toBe(true);
    expect(hasFileProtocolDependency({ dependencies: { express: '^5.0.0' } })).toBe(false);
  });
});

function plantVendor(packageRoot: string) {
  const vendor = path.join(packageRoot, 'vendor', '@0xray', 'repertoire');
  mkdirSync(vendor, { recursive: true });
  writeFileSync(
    path.join(vendor, 'package.json'),
    `${JSON.stringify({ name: '@0xray/repertoire', version: '0.2.8' })}\n`,
  );
  return vendor;
}

function treeSnapshot(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) out.push(`link ${rel} -> ${readlinkSync(abs)}`);
      else if (st.isDirectory()) {
        out.push(`dir ${rel}`);
        walk(abs);
      } else out.push(`file ${rel}`);
    }
  };
  walk(root);
  return out.sort();
}

describe('postinstall repertoire link', () => {
  const postinstallPath = path.join(root, 'scripts/node/postinstall.cjs');

  function run(packageRoot: string, targetDir: string) {
    const { runPostinstall } = require(postinstallPath) as {
      runPostinstall: (pkg: string, target: string, log?: () => void) => void;
    };
    runPostinstall(packageRoot, targetDir, () => {});
  }

  it('lets a consumer require the vendored organ after install', () => {
    const target = mkdtempSync(path.join(os.tmpdir(), 'xray-postinstall-link-'));
    const packageRoot = path.join(target, 'node_modules', '0xray');
    try {
      plantVendor(packageRoot);
      writeFileSync(path.join(target, 'package.json'), `${JSON.stringify({ name: 'xray-consumer-test' })}\n`);
      run(packageRoot, target);
      const consumerRequire = createRequire(path.join(target, 'package.json'));
      const organ = consumerRequire('@0xray/repertoire/package.json') as { name: string; version: string };
      expect(organ.name).toBe('@0xray/repertoire');
      expect(organ.version).toBe('0.2.8');
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('writes nothing except the relative repertoire link', () => {
    const parent = mkdtempSync(path.join(os.tmpdir(), 'xray-postinstall-snap-'));
    const target = path.join(parent, 'proj');
    const home = path.join(parent, 'home');
    const packageRoot = path.join(target, 'node_modules', '0xray');
    mkdirSync(path.join(target, 'node_modules', '@0xray'), { recursive: true });
    mkdirSync(home, { recursive: true });
    const vendor = plantVendor(packageRoot);
    writeFileSync(path.join(target, 'package.json'), `${JSON.stringify({ name: 'xray-consumer-test' })}\n`);
    writeFileSync(path.join(target, 'keep.txt'), 'stay\n');
    writeFileSync(path.join(home, 'keep.txt'), 'home\n');
    const before = treeSnapshot(target);
    const homeBefore = treeSnapshot(home);
    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      run(packageRoot, target);
      const dest = path.join(target, 'node_modules', '@0xray', 'repertoire');
      const rel = path.relative(path.dirname(dest), vendor);
      const added = treeSnapshot(target).filter((line) => !before.includes(line));
      expect(added).toEqual([`link node_modules/@0xray/repertoire -> ${rel}`]);
      expect(path.isAbsolute(readlinkSync(dest))).toBe(false);
      expect(readlinkSync(dest)).toBe(rel);
      expect(treeSnapshot(home)).toEqual(homeBefore);
    } finally {
      process.env.HOME = prevHome;
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('leaves a real package directory and a foreign symlink alone and exits 0', () => {
    const parent = mkdtempSync(path.join(os.tmpdir(), 'xray-postinstall-keep-'));
    const realRoot = path.join(parent, 'real');
    const foreignRoot = path.join(parent, 'foreign');
    try {
      const realPkg = path.join(realRoot, 'node_modules', '0xray');
      plantVendor(realPkg);
      const realDest = path.join(realRoot, 'node_modules', '@0xray', 'repertoire');
      mkdirSync(realDest, { recursive: true });
      writeFileSync(
        path.join(realDest, 'package.json'),
        `${JSON.stringify({ name: '@0xray/repertoire', version: '9.9.9' })}\n`,
      );
      const realBefore = readFileSync(path.join(realDest, 'package.json'));

      const foreignPkg = path.join(foreignRoot, 'node_modules', '0xray');
      plantVendor(foreignPkg);
      const elsewhere = path.join(foreignRoot, 'elsewhere');
      mkdirSync(elsewhere, { recursive: true });
      writeFileSync(path.join(elsewhere, 'marker.txt'), 'other\n');
      const foreignDest = path.join(foreignRoot, 'node_modules', '@0xray', 'repertoire');
      mkdirSync(path.dirname(foreignDest), { recursive: true });
      symlinkSync(elsewhere, foreignDest);
      const foreignBefore = readlinkSync(foreignDest);

      const ran = spawnSync(
        process.execPath,
        [
          '-e',
          `const { runPostinstall } = require(${JSON.stringify(postinstallPath)});
           runPostinstall(${JSON.stringify(realPkg)}, ${JSON.stringify(realRoot)});
           runPostinstall(${JSON.stringify(foreignPkg)}, ${JSON.stringify(foreignRoot)});`,
        ],
        { encoding: 'utf8' },
      );
      expect(ran.status).toBe(0);
      expect(lstatSync(realDest).isDirectory()).toBe(true);
      expect(readFileSync(path.join(realDest, 'package.json'))).toEqual(realBefore);
      expect(readlinkSync(foreignDest)).toBe(foreignBefore);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('links the same relative path on a second install', () => {
    const target = mkdtempSync(path.join(os.tmpdir(), 'xray-postinstall-twice-'));
    const packageRoot = path.join(target, 'node_modules', '0xray');
    try {
      const vendor = plantVendor(packageRoot);
      run(packageRoot, target);
      const dest = path.join(target, 'node_modules', '@0xray', 'repertoire');
      const once = treeSnapshot(target);
      const link = readlinkSync(dest);
      expect(path.isAbsolute(link)).toBe(false);
      expect(link).toBe(path.relative(path.dirname(dest), vendor));
      run(packageRoot, target);
      expect(treeSnapshot(target)).toEqual(once);
      expect(readlinkSync(dest)).toBe(link);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
