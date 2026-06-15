#!/usr/bin/env node
/**
 * 0xRay MCP Server — Railway HTTP entry point.
 *
 * Starts the governance MCP server in Streamable HTTP mode
 * so Grok and other HTTP MCP clients can connect.
 *
 * Environment:
 *   PORT              — HTTP listen port (default: 3000, Railway sets this)
 *   GOVERNANCE_API_KEY — Optional API key for X-API-Key auth
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// If XRAY_HERMES_AUTH env var is set (base64-encoded ~/.hermes/auth.json),
// decode and write it so the LLM governance provider can find it
if (process.env.XRAY_HERMES_AUTH) {
  try {
    const authPath = join(homedir(), '.hermes', 'auth.json');
    const content = Buffer.from(process.env.XRAY_HERMES_AUTH, 'base64').toString('utf-8');
    fs.mkdirSync(join(homedir(), '.hermes'), { recursive: true });
    fs.writeFileSync(authPath, content, 'utf-8');
    console.log('[mcp-server] Decoded XRAY_HERMES_AUTH ->', authPath);
  } catch (err) {
    console.error('[mcp-server] Failed to decode XRAY_HERMES_AUTH:', err.message);
  }
}

// Set MCP_PORT and MCP_HOST so governance.server.ts picks up HTTP mode
const port = process.env.PORT || '3000';
process.env.MCP_PORT = port;
process.env.MCP_HOST = process.env.MCP_HOST || '0.0.0.0';

// Import and run the governance server in HTTP mode
const serverPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  'dist', 'mcps', 'governance.server.js'
);

const { GovernanceServer } = await import(serverPath);
const server = new GovernanceServer();
await server.runHttp(parseInt(port, 10));
