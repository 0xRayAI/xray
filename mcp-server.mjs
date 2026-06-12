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

// Set MCP_PORT so governance.server.ts picks up HTTP mode
const port = process.env.PORT || '3000';
process.env.MCP_PORT = port;

// Import and run the governance server in HTTP mode
const serverPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  'dist', 'mcps', 'governance.server.js'
);

const { GovernanceServer } = await import(serverPath);
const server = new GovernanceServer();
await server.runHttp(parseInt(port, 10));
