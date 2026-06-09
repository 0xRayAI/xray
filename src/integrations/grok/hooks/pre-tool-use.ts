/**
 * Grok PreToolUse Hook for 0xRay
 *
 * This hook is called before any tool is executed in Grok.
 * It can be used to enforce governance rules via the Dynamo Solar SSOT.
 *
 * For now this is a skeleton. Full implementation will call GovernanceService.
 *
 * Phase 0.4 E2E hardening: every exit path now emits a valid JSON decision
 * object with fallback defaults. The hook never produces partial or missing
 * output, even when env context is absent.
 */

import { frameworkLogger } from '../../../core/framework-logger.js';

interface PreToolUseInput {
  tool: string;
  args?: any;
}

function safeLog(component: string, action: string, status: string, details?: Record<string, unknown>): void {
  try {
    frameworkLogger.log(component, action, status as any, details).catch(() => {});
  } catch {}
}

export async function handlePreToolUse(input: PreToolUseInput, output: any): Promise<void> {
  try {
    safeLog('grok-hook', 'pre-tool-use', 'info', {
      tool: input.tool,
      message: '0xRay PreToolUse hook triggered'
    });

    if (input.tool === 'Bash' && input.args?.command?.includes('rm -rf /')) {
      output.decision = 'block';
      output.reason = 'Blocked by 0xRay governance (dangerous command)';
      safeLog('grok-hook', 'pre-tool-use-blocked', 'warning', {
        tool: input.tool,
        command: input.args?.command
      });
    }
  } catch {
    safeLog('grok-hook', 'pre-tool-use-error', 'error', { tool: input.tool });
  }

  if (!output.decision) {
    output.decision = 'allow';
  }
}

export default handlePreToolUse;

// Support direct execution as script (for e2e tests that run node hook.js with env vars).
// Every exit path emits valid JSON to stdout with sensible defaults.
if (import.meta.url === `file://${process.argv[1]}`) {
  // Redirect console to stderr so only the decision JSON goes to stdout
  const _stderrWrite = process.stderr.write.bind(process.stderr);
  console.log = (...args: any[]) => { _stderrWrite(args.join(' ') + '\n'); };
  console.info = (...args: any[]) => { _stderrWrite('[INFO] ' + args.join(' ') + '\n'); };
  console.debug = (...args: any[]) => { _stderrWrite('[DEBUG] ' + args.join(' ') + '\n'); };
  console.warn = (...args: any[]) => { _stderrWrite('[WARN] ' + args.join(' ') + '\n'); };

  (async () => {
    const output: any = {};
    try {
      const input: PreToolUseInput = {
        tool: process.env.TOOL_NAME || process.env.HOOK_TOOL || 'unknown',
        args: process.env.HOOK_ARGS ? (() => { try { return JSON.parse(process.env.HOOK_ARGS); } catch { return process.env.HOOK_ARGS; } })() : undefined
      };
      await handlePreToolUse(input, output);
    } catch {
      output.decision = output.decision || 'allow';
    }

    const decision = {
      decision: output.decision || 'allow',
      resonance: output.resonance ?? 0.5,
      reason: output.reason || '',
      reasoning: output.reasoning || 'no context available, defaulting to allow',
      solar_recommendation: output.solar_recommendation || 'approve',
      gov: { recommendation: output.solar_recommendation || 'approve' },
      timestamp: Date.now(),
    };
    process.stdout.write(JSON.stringify(decision) + '\n');
    process.exit(0);
  })();
}