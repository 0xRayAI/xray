import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { writeProjectRepertoireMcp } from '../../integrations/grok/grok-cli.js';

describe('writeProjectRepertoireMcp', () => {
  it('writes config.toml on the project, not the package', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-grok-toml-'));
    const pkg = path.join(parent, 'node_modules', '0xray');
    const project = path.join(parent, 'app');
    const repertoire = path.join(parent, 'repertoire');
    try {
      mkdirSync(pkg, { recursive: true });
      mkdirSync(project, { recursive: true });
      mkdirSync(path.join(repertoire, 'dist', 'mcp'), { recursive: true });
      writeFileSync(path.join(repertoire, 'package.json'), JSON.stringify({ name: '@0xray/repertoire' }));
      const serverJs = path.join(repertoire, 'dist', 'mcp', 'server.js');
      writeFileSync(serverJs, 'export {}\n');

      const tomlPath = writeProjectRepertoireMcp(project);
      expect(tomlPath).toBe(path.join(project, '.grok', 'config.toml'));
      expect(existsSync(tomlPath || '')).toBe(true);
      expect(existsSync(path.join(pkg, '.grok', 'config.toml'))).toBe(false);
      const toml = readFileSync(tomlPath as string, 'utf8');
      expect(toml).toContain('[mcp_servers.repertoire]');
      expect(toml).toContain(JSON.stringify(serverJs));
      expect(toml).toContain('enabled = true');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('returns null when Repertoire is not installed next to the project', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-grok-toml-none-'));
    try {
      expect(writeProjectRepertoireMcp(project)).toBeNull();
      expect(existsSync(path.join(project, '.grok', 'config.toml'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
