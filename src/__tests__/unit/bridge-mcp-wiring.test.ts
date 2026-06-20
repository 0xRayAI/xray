import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const wiring = require(path.join(__dirname, '..', '..', '..', 'scripts', 'node', 'bridge-mcp-wiring.cjs'));

describe('bridge-mcp-wiring', () => {
  it('builds 7 portable xray servers without absolute paths', () => {
    const portable = wiring.buildPortableProjectMcpJson();
    const names = Object.keys(portable.mcpServers);
    expect(names.filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    const raw = JSON.stringify(portable);
    expect(raw).not.toMatch(/\/Users\//);
    expect(portable.mcpServers['xray-governance'].env?.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
  });

  it('builds Hermes mcp_servers with XRAY_ROOT for consumer cwd', () => {
    const targetDir = '/tmp/repertoire-consumer';
    const servers = wiring.buildHermesMcpServers(targetDir);
    expect(Object.keys(servers).filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    expect(servers['xray-enforcer'].env.XRAY_ROOT).toBe(targetDir);
  });

  it('builds OpenCode mcp entries as local enabled servers', () => {
    const entries = wiring.buildOpencodeMcpEntries('/tmp/consumer');
    expect(entries['xray-skills'].type).toBe('local');
    expect(entries['xray-skills'].enabled).toBe(true);
    expect(entries['xray-skills'].command).toEqual(['npx', '-y', '0xray', 'mcp', 'skills']);
  });

  it('builds OpenClaw mcp servers with XRAY_ROOT for consumer cwd', () => {
    const targetDir = '/tmp/openclaw-consumer';
    const servers = wiring.buildOpenClawMcpServers(targetDir);
    expect(Object.keys(servers).filter((n: string) => n.startsWith('xray-'))).toHaveLength(7);
    expect(servers['xray-governance'].env.XRAY_FORCE_MCP_GOVERNANCE).toBe('true');
    expect(servers['xray-governance'].env.XRAY_ROOT).toBe(targetDir);
  });

  it('keeps install-bridges and grok-cli wired to bridge-mcp-wiring SSOT', () => {
    const packageRoot = path.join(__dirname, '..', '..', '..');
    const installSrc = readFileSync(path.join(packageRoot, 'scripts/node/install-bridges.cjs'), 'utf8');
    const grokSrc = readFileSync(path.join(packageRoot, 'src/integrations/grok/grok-cli.ts'), 'utf8');
    expect(installSrc).toContain('XRAY_MCP_SERVERS');
    expect(installSrc).toContain('bridge-mcp-wiring.cjs');
    expect(installSrc).not.toMatch(/const XRAY_MCP_SERVERS = \[/);
    expect(grokSrc).toContain('bridge-mcp-wiring.cjs');
    expect(grokSrc).not.toMatch(/const XRAY_MCP_SERVERS = \[/);
  });
});