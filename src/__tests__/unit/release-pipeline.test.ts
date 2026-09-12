import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getReleaseArtifactPaths } from '../../../scripts/foundry/version-manager.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('release pipeline', () => {
  it('does not hook npm publish lifecycle to re-run the gate after upload', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.publish).toBeUndefined();
    expect(pkg.scripts['release:npm']).toContain('--publish-only');
    expect(pkg.scripts['release:npm']).toContain('scripts/foundry/release.mjs');
    expect(pkg.scripts.prepublishOnly).not.toContain('release:gate');
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

  it('canonical release.mjs bumps via reconcile, not version-manager', () => {
    const src = readFileSync(path.join(root, 'scripts/foundry/release.mjs'), 'utf8');
    expect(src).toContain('reconcile-version.mjs');
    expect(src).toContain('version-manager.mjs');
    expect(src).toContain('--artifacts-only');
    expect(src).not.toContain('version-manager.mjs patch');
  });
});
