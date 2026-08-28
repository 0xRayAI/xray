#!/usr/bin/env node
/**
 * OpenClaw host PreToolUse runtime — stdin JSON → stdout { action: block|allow }.
 * Installed to ~/.openclaw/hooks/xray-pre-tool.mjs by `0xray openclaw install`.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function resolveGate() {
  const envRoot = process.env.XRAY_AI_PATH || process.env.XRAY_ROOT || '';
  const candidates = [
    envRoot ? join(envRoot, 'dist/nucleus/delegation-gate.js') : '',
    join(__dirname, '../../../nucleus/delegation-gate.js'),
    join(__dirname, '../../../../dist/nucleus/delegation-gate.js'),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/delegation-gate.js'),
    join(process.cwd(), 'dist/nucleus/delegation-gate.js'),
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error('delegation-gate.js missing — build 0xray or npm install 0xray');
  }
  return require(found);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stdin.setEncoding('utf8');
    stdin.on('data', (c) => chunks.push(c));
    stdin.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    stdin.on('error', reject);
  });
}

function decide(event, gate) {
  const projectRoot =
    event.cwd || event.workspaceRoot || event.projectRoot || process.cwd();
  const sessionId = event.sessionId || event.session_id || 'openclaw';
  const toolName = event.tool || event.toolName || event.name || 'unknown';
  const args = event.args || event.toolInput || event.input || {};
  const features = gate.loadDelegationGateFeatures(projectRoot, 'openclaw');
  const outcome = gate.evaluatePreToolGate(toolName, args, {
    projectRoot,
    sessionId,
    features,
    host: 'openclaw',
  });
  if (!outcome.allow) {
    return {
      action: 'block',
      allow: false,
      reason: outcome.reason,
      gate: outcome.gate,
    };
  }
  return {
    action: 'allow',
    allow: true,
    reason: outcome.reason,
    gate: outcome.gate,
    warn: Boolean(outcome.reason),
  };
}

async function main() {
  try {
    const event = await readStdin();
    const gate = resolveGate();
    const decision = decide(event, gate);
    console.log(JSON.stringify(decision));
    process.exit(decision.action === 'block' ? 2 : 0);
  } catch (err) {
    console.log(
      JSON.stringify({
        action: 'block',
        allow: false,
        gate: 'openclaw-pre-tool-error',
        reason: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(2);
  }
}

main();
