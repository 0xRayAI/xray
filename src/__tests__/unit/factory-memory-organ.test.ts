import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('factory memory organ wear', () => {
  it('ships memory_routing on with the vendored repertoire module path', () => {
    const features = JSON.parse(readFileSync(path.join(root, 'xray/features.json'), 'utf8'));
    expect(features.memory_routing.enabled).toBe(true);
    expect(features.memory_routing.provider).toBe('repertoire');
    expect(features.memory_routing.module_path).toContain('@0xray/repertoire');
    expect(features.memory_routing.config.statePath).toBe(
      '.xray/state/repertoire/inference-state.json',
    );
  });

  it('vendors 0.2 factory seed without bedrock names', () => {
    const pkg = JSON.parse(
      readFileSync(path.join(root, 'vendor/@0xray/repertoire/package.json'), 'utf8'),
    );
    expect(pkg.name).toBe('@0xray/repertoire');
    expect(pkg.version).toBe('0.2.0');
    expect(pkg.dependencies?.['0xray']).toBeUndefined();
    const registry = JSON.parse(
      readFileSync(path.join(root, 'vendor/@0xray/repertoire/data/curated_signals.json'), 'utf8'),
    );
    expect(registry.source).toBe('factory-seed-4.0');
    const names: string[] = registry.signals.map((s: { name: string }) => s.name);
    expect(names.length).toBeGreaterThanOrEqual(8);
    expect(names.length).toBeLessThanOrEqual(24);
    expect(names.some((n) => n.toLowerCase().startsWith('bedrock'))).toBe(false);
    expect(existsSync(path.join(root, 'vendor/@0xray/repertoire/dist/mcp/server.js'))).toBe(true);
  });

  it('does not add an 8th xray MCP in the canonical list', () => {
    const wiring = require(path.join(root, 'scripts/node/bridge-mcp-wiring.cjs'));
    expect(wiring.XRAY_MCP_SERVERS).toHaveLength(7);
    expect(wiring.XRAY_MCP_SERVERS.every((s: { name: string }) => s.name.startsWith('xray-'))).toBe(
      true,
    );
  });
});
