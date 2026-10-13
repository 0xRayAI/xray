#!/usr/bin/env node
/**
 * Cursor preToolUse — 0xRay constitution gate.
 * Contract: stdin JSON → stdout {"permission":"allow"|"deny"}
 * Does not rely on sessionStart (unavailable on managed cloud).
 */

// Gate modules load inside main()'s try (dynamic import): a missing or broken module must deny, not crash
// before the handler with no JSON (Cursor would then fail open). Nothing here may import them statically.
let appendHookActivity = () => {};

/** Deny JSON on stdout and exit 0. Used when the gate cannot run at all. */
function denyHard(reason) {
  try {
    process.stdout.write(`${JSON.stringify({ permission: 'deny', user_message: reason, agent_message: reason })}\n`);
  } finally {
    process.exit(0);
  }
}

export function cursorHookErrorPermission(err) {
  if (err?.code === 'EACCES') return 'allow';   // code only: a message mentioning EACCES is not a permission error
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
  try {
    appendHookActivity(root, 'cursor-pre-tool-use', permission, permission === 'deny' ? 'error' : 'info', {
      tool: toolName,
      reason: reason || hint || null,
      gate: extra.gate || null,
      livePath: true,
    });
  } catch { /* the verdict is already on stdout; activity logging must not change it */ }
  process.exit(0);
}

async function main() {
  let fallbackRoot = process.cwd();
  let toolName = 'unknown';

  try {
    const u = await import('./cursor-hook-utils.js');
    const { lensDecision, repertoireRoute } = await import('../../hooks/pre-tool-speak.mjs');
    const {
      checkCodexPatterns, checkFullTestSuite, cursorGateRoot, cursorHeatRoots, cursorSessionId, cursorToolContext,
      cursorWorkspaceRoot, ensureCursorSessionBoot, evaluatePreToolGate, isShellTool, isWriteTool,
      loadDelegationGateFeatures, loadFeatures, readStdinJson,
    } = u;
    appendHookActivity = u.appendHookActivity;
    fallbackRoot = cursorWorkspaceRoot();
    const event = await readStdinJson();
    // readStdinJson returns {} for empty or malformed stdin; Cursor always sends a JSON object, so deny those.
    if (!event || typeof event !== 'object' || Array.isArray(event) || Object.keys(event).length === 0) {
      finish(fallbackRoot, 'deny', 'preToolUse: empty or malformed hook input — denied', null, toolName, { gate: 'bad-input' });
    }
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
    try {
      appendHookActivity(fallbackRoot, 'cursor-pre-tool-use', 'hook-error', 'error', {
        tool: toolName,
        error: err.message,
        failOpen,
      });
    } catch { /* logging must not turn a deny into a crash */ }
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
if (launchedAsCli) {
  process.on('uncaughtException', (err) => denyHard(`preToolUse hook crashed — denied: ${err?.message || err}`));
  process.on('unhandledRejection', (err) => denyHard(`preToolUse hook crashed — denied: ${err?.message || err}`));
  main().catch((err) => denyHard(`preToolUse hook crashed — denied: ${err?.message || err}`));
}
