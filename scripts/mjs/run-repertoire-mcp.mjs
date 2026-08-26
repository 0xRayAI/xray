#!/usr/bin/env node
/**
 * CWD-proof Repertoire MCP launcher for the 0xray framework checkout.
 * Grok/OpenCode spawn this in-repo path so they never have to resolve `../repertoire`.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const xrayRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const candidates = [
  join(xrayRoot, '..', 'repertoire', 'dist', 'mcp', 'server.js'),
  join(xrayRoot, 'node_modules', '@0xray', 'repertoire', 'dist', 'mcp', 'server.js'),
];
const server = candidates.find((p) => existsSync(p));
if (!server) {
  process.stderr.write(
    'repertoire MCP missing — build ../repertoire or install @0xray/repertoire\n',
  );
  process.exit(1);
}

const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env: process.env,
});
child.on('error', (err) => {
  process.stderr.write(`repertoire MCP spawn failed: ${err.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
