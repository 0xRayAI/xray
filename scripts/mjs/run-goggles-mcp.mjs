#!/usr/bin/env node
/**
 * CWD-proof Goggles MCP launcher.
 * Resolves the organ server from this file, not from the caller's cwd.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const xrayRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const candidates = [
  join(xrayRoot, 'dist', 'integrations', 'hooks', 'goggles-mcp.mjs'),
  join(xrayRoot, 'src', 'integrations', 'hooks', 'goggles-mcp.mjs'),
];
const server = candidates.find((file) => existsSync(file));
if (!server) {
  process.stderr.write('goggles MCP missing\n');
  process.exit(1);
}

const env = { ...process.env };
if (!env.GOGGLES_ROOT || env.GOGGLES_ROOT === '.') {
  env.GOGGLES_ROOT = resolve(process.cwd());
}

const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env,
});
child.on('error', (err) => {
  process.stderr.write(`goggles MCP spawn failed: ${err.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
