import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { writeProjectGogglesMcp, writeProjectRepertoireMcp } from '../../integrations/grok/grok-cli.js';

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

describe('writeProjectGogglesMcp', () => {
  it('writes the goggles launcher on the project toml', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-grok-goggles-'));
    const launcher = path.join(project, 'node_modules', '0xray', 'scripts', 'mjs', 'run-goggles-mcp.mjs');
    try {
      mkdirSync(path.dirname(launcher), { recursive: true });
      writeFileSync(launcher, '#!/usr/bin/env node\n');
      const tomlPath = writeProjectGogglesMcp(project);
      expect(tomlPath).toBe(path.join(project, '.grok', 'config.toml'));
      const toml = readFileSync(tomlPath as string, 'utf8');
      expect(toml).toContain('[mcp_servers.goggles]');
      expect(toml).toContain(JSON.stringify(launcher));
      expect(toml).not.toMatch(/TOKEN|SECRET|API_KEY|WALLET/i);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('returns null when the launcher is not installed', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-grok-goggles-none-'));
    try {
      expect(writeProjectGogglesMcp(project)).toBeNull();
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
