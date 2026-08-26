/**
 * OpenClaw host-agent PreToolUse adapter.
 * Platform still lacks a native consumer tool-block API; this SSOT is what
 * install writes to ~/.openclaw/hooks and what the integration uses on tool.before.
 */
import {
  evaluatePreToolGate,
  loadDelegationGateFeatures,
  type ToolGateInput,
} from '../../nucleus/delegation-gate.js';

export interface OpenClawPreToolContext {
  projectRoot: string;
  sessionId: string;
}

export interface OpenClawPreToolDecision {
  action: 'block' | 'allow';
  allow: boolean;
  reason?: string;
  gate?: string;
  hint?: unknown;
  warn?: boolean;
}

export function evaluateOpenClawHostPreTool(
  toolName: string,
  args: ToolGateInput,
  ctx: OpenClawPreToolContext,
): OpenClawPreToolDecision {
  const features = loadDelegationGateFeatures(ctx.projectRoot, 'openclaw');
  const outcome = evaluatePreToolGate(toolName, args, {
    projectRoot: ctx.projectRoot,
    sessionId: ctx.sessionId,
    features,
    host: 'openclaw',
  });

  if (!outcome.allow) {
    const blocked: OpenClawPreToolDecision = {
      action: 'block',
      allow: false,
      reason: outcome.reason,
      gate: outcome.gate,
    };
    if ('hint' in outcome && outcome.hint) blocked.hint = outcome.hint;
    return blocked;
  }

  const allowed: OpenClawPreToolDecision = {
    action: 'allow',
    allow: true,
  };
  if (outcome.reason) {
    allowed.reason = outcome.reason;
    allowed.warn = true;
  }
  if (outcome.gate) allowed.gate = outcome.gate;
  if ('hint' in outcome && outcome.hint) allowed.hint = outcome.hint;
  return allowed;
}
