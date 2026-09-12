import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
