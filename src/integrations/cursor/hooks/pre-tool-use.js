#!/usr/bin/env node
/**
 * Cursor preToolUse — 0xRay constitution gate.
 * Contract: stdin JSON → stdout {"permission":"allow"|"deny"}
 * Does not rely on sessionStart (unavailable on managed cloud).
 */

import {
  appendHookActivity,
  checkCodexPatterns,
  checkFullTestSuite,
  cursorGateRoot,
  cursorHeatRoots,
  cursorSessionId,
  cursorToolContext,
  cursorWorkspaceRoot,
  ensureCursorSessionBoot,
  evaluatePreToolGate,
  isShellTool,
  isWriteTool,
  loadDelegationGateFeatures,
  loadFeatures,
  readStdinJson,
} from './cursor-hook-utils.js';
import { lensDecision, repertoireRoute } from '../../hooks/pre-tool-speak.mjs';

export function cursorHookErrorPermission(err) {
  const message = typeof err?.message === 'string' ? err.message : '';
  if (err?.code === 'EACCES' || message.includes('EACCES')) return 'allow';
  return 'deny';
}

function finish(root, permission, reason, hint, toolName, extra = {}) {
  const out = { permission };
  if (reason) {
    out.user_message = reason;
    out.agent_message = reason;
  }
  if (hint && permission === 'allow') {
    out.user_message = hint;
  }
  if (extra.hookSpecificOutput) out.hookSpecificOutput = extra.hookSpecificOutput;
  console.log(JSON.stringify(out));
  appendHookActivity(root, 'cursor-pre-tool-use', permission, permission === 'deny' ? 'error' : 'info', {
    tool: toolName,
    reason: reason || hint || null,
    gate: extra.gate || null,
    livePath: true,
  });
  process.exit(0);
}

async function main() {
  const fallbackRoot = cursorWorkspaceRoot();
  let toolName = 'unknown';

  try {
    const event = await readStdinJson();
    const eventRoot = cursorWorkspaceRoot(event);
    const sessionId = cursorSessionId(event);
    const heatRoots = cursorHeatRoots(event);
    for (const root of heatRoots) {
      ensureCursorSessionBoot(root, '0xray/cursor-pre-tool-use-boot', { sessionId });
    }
    const gateRoot = cursorGateRoot(heatRoots, eventRoot);

    const features = loadFeatures(gateRoot);
    const gateFeatures = loadDelegationGateFeatures(gateRoot, 'cursor');
    const ctx = cursorToolContext(event);
    toolName = ctx.toolName;
    const { content, cmd, toolInput, paths } = ctx;

    const gateBlock = evaluatePreToolGate(toolName, toolInput, {
      projectRoot: gateRoot,
      sessionId,
      features: gateFeatures,
      host: 'cursor',
    });
    if (!gateBlock.allow) {
      finish(gateRoot, 'deny', gateBlock.reason, gateBlock.hint, toolName, { gate: gateBlock.gate });
    }

    if (isWriteTool(toolName) && content) {
      const extraBlock = checkCodexPatterns(content, { terms: [11, 29] });
      if (extraBlock) finish(gateRoot, 'deny', extraBlock, null, toolName);
    }

    const spoken = [content, cmd, toolInput.pattern, toolInput.query, ...(paths || [])].filter(Boolean).join('\n');
    const lensStop = lensDecision(gateRoot, toolName, spoken);
    if (lensStop?.decision === 'deny') {
      finish(gateRoot, 'deny', lensStop.reason, null, toolName, { gate: lensStop.gate });
    }
    const route = repertoireRoute([toolName, cmd, content].filter(Boolean).join(' '));

    if (isShellTool(toolName) && cmd) {
      const testHint = checkFullTestSuite(cmd, features);
      if (testHint) finish(gateRoot, 'allow', null, testHint, toolName, { ...(route || {}) });
    }

    if (gateBlock.reason) {
      finish(gateRoot, 'allow', gateBlock.reason, gateBlock.hint, toolName, {
        gate: gateBlock.gate,
        warn: true,
        ...(route || {}),
      });
    }

    finish(gateRoot, 'allow', null, null, toolName, { ...(route || {}) });
  } catch (err) {
    const failOpen = cursorHookErrorPermission(err) === 'allow';
    appendHookActivity(fallbackRoot, 'cursor-pre-tool-use', 'hook-error', 'error', {
      tool: toolName,
      error: err.message,
      failOpen,
    });
    if (failOpen) {
      // Dest EACCES on a Cloud workspace wrapper must not deny every tool.
      finish(
        fallbackRoot,
        'allow',
        `preToolUse hook error — fail open: ${err.message}`,
        null,
        toolName,
        { gate: 'hook-error-fail-open' },
      );
    }
    finish(
      fallbackRoot,
      'deny',
      `preToolUse hook error blocked the tool: ${err.message}`,
      null,
      toolName,
      { gate: 'hook-error' },
    );
  }
}

const launchedAsCli = Boolean(process.argv[1] && process.argv[1].endsWith('pre-tool-use.js'));
if (launchedAsCli) main();
