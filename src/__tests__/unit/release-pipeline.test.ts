import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('release pipeline', () => {
  it('does not hook npm publish lifecycle to re-run the gate after upload', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.publish).toBeUndefined();
    expect(pkg.scripts['release:npm']).toContain('release:gate');
    expect(pkg.scripts['release:npm']).toContain('npm publish --access public');
    expect(pkg.scripts.prepublishOnly).not.toContain('release:gate');
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
    const src = readFileSync(path.join(root, 'scripts/node/reconcile-version.mjs'), 'utf8');
    expect(src).not.toContain('tag v${tag} exists but npm is only');
  });

  it('canonical release.mjs bumps via reconcile, not version-manager', () => {
    const src = readFileSync(path.join(root, 'scripts/node/release.mjs'), 'utf8');
    expect(src).toContain('reconcile-version.mjs');
    expect(src).toContain('version-manager.mjs --artifacts-only');
    expect(src).not.toContain('version-manager.mjs patch');
  });
});
