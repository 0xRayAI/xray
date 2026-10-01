import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getReleaseArtifactPaths } from '../../../scripts/foundry/version-manager.mjs';
import { waitUntilListed } from '../../../scripts/foundry/release.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('release pipeline', () => {
  it('does not hook npm publish lifecycle to re-run the gate after upload', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.publish).toBeUndefined();
    expect(pkg.scripts['release:npm']).toContain('--publish-only');
    expect(pkg.scripts['release:npm']).toContain('scripts/foundry/release.mjs');
    expect(pkg.scripts.prepublishOnly).not.toContain('release:gate');
    expect(pkg.scripts.prepack).toContain('assert-packed-dist-cli.mjs');
  });

  it('pack-tmp-suit-proof is the pack → tmp mill+hangar inspect gate', () => {
    const proof = readFileSync(path.join(root, 'scripts/node/pack-tmp-suit-proof.mjs'), 'utf8');
    const smoke = readFileSync(path.join(root, 'scripts/node/consumer-install-smoke.mjs'), 'utf8');
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      files: string[];
    };
    expect(pkg.scripts['pack:tmp-proof']).toContain('pack-tmp-suit-proof.mjs');
    expect(pkg.files).toContain('llms.txt');
    expect(proof).toContain('mint');
    expect(proof).toContain('--skip-live');
    expect(proof).toContain('shop-extract');
    expect(proof).toContain('groover-hangar');
    expect(proof).not.toContain('"costume": true');
    expect(smoke).toContain('proveSuitAfterInstall');
    expect(smoke).toContain('pack-tmp-suit-proof.mjs');
  });

  it('consumer smoke matches shipped factory organ (memory_routing on)', () => {
    const features = JSON.parse(readFileSync(path.join(root, 'xray/features.json'), 'utf8'));
    expect(features.memory_routing.enabled).toBe(true);
    const smoke = readFileSync(path.join(root, 'scripts/node/consumer-install-smoke.mjs'), 'utf8');
    expect(smoke).toContain('memory_routing.enabled !== true');
    expect(smoke).not.toContain('memory_routing.enabled=false (got');
    expect(smoke).toContain('explicit memory_routing opt-out');
  });

  it('reconcile --check does not fail tagged-but-unpublished (that is the publish path)', () => {
    const src = readFileSync(path.join(root, 'scripts/foundry/reconcile-version.mjs'), 'utf8');
    expect(src).not.toContain('tag v${tag} exists but npm is only');
  });

  it('release commit set includes stamp/gate version files', () => {
    const paths = getReleaseArtifactPaths(root);
    expect(paths).toContain('xray/features.json');
    expect(paths).toContain('.xray/features.json');
    expect(paths).toContain('docs/PIPELINE-FACET-SNAPSHOT.json');
    expect(paths).toContain('src/integrations/openclaw/plugin/xray-pre-tool/package.json');
  });

  it('release:docs-check runs reconcile --check then validate-release-docs', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['release:docs-check']).toContain('reconcile-version.mjs --check');
    expect(pkg.scripts['release:docs-check']).toContain('validate-release-docs.mjs');
  });

  it('does not treat an upload as published until npm view lists it', () => {
    const lines: string[] = [];
    let clock = 0;
    let checks = 0;
    const ok = waitUntilListed('4.0.34', {
      name: '0xray',
      listed: () => {
        checks += 1;
        return checks >= 3;
      },
      sleep: () => {
        clock += 15000;
      },
      now: () => clock,
      log: (line: string) => lines.push(line),
      intervalMs: 15000,
      timeoutMs: 60000,
    });
    expect(ok).toBe(true);
    expect(checks).toBe(3);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('has not listed 0xray@4.0.34');
  });

  it('does not push a tag when the registry never lists the upload', () => {
    const failures: string[] = [];
    let clock = 0;
    const ok = waitUntilListed('4.0.34', {
      name: '0xray',
      listed: () => false,
      sleep: () => {
        clock += 15000;
      },
      now: () => clock,
      log: () => {},
      fail: (line: string) => failures.push(line),
      intervalMs: 15000,
      timeoutMs: 30000,
    });
    expect(ok).toBe(false);
    expect(failures[0]).toContain('Tag not pushed');
  });

  it('canonical release.mjs bumps via reconcile, not version-manager', () => {
    const src = readFileSync(path.join(root, 'scripts/foundry/release.mjs'), 'utf8');
    expect(src).toContain('reconcile-version.mjs');
    expect(src).toContain('version-manager.mjs');
    expect(src).toContain('--artifacts-only');
    expect(src).not.toContain('version-manager.mjs patch');
  });
});
