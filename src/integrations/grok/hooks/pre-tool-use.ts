/**
 * Grok PreToolUse Hook for 0xRay
 *
 * Pre-tool enforcement hook that computes a resonance score from tool
 * context and runs it through the Dynamo Solar SSOT decision matrix.
 * Emits structured JSON on stdout for Grok CLI integration.
 */

import { frameworkLogger } from '../../../core/framework-logger.js';

interface PreToolUseInput {
  tool: string;
  args?: any;
}

function deriveResonance(tool: string, args: string): number {
  const dangerous = ['eval', 'exec(', 'child_process', 'rm -rf', '> /dev/sda', 'chmod 777', 'Buffer.alloc'];
  const cleanOps = ['read', 'get', 'list', 'stat', 'index'];

  const lowerArgs = args.toLowerCase();
  const toolLower = tool.toLowerCase();

  const dangerHits = dangerous.filter(d => lowerArgs.includes(d)).length;
  const cleanHits = cleanOps.filter(c => lowerArgs.includes(c)).length;

  let score = 0.85;
  score -= dangerHits * 0.25;
  if (toolLower.includes('write') || toolLower.includes('edit') || toolLower.includes('delete')) score -= 0.15;
  if (toolLower.includes('terminal') || toolLower.includes('bash')) score -= 0.10;
  score += cleanHits * 0.05;

  return Math.max(0, Math.min(1, score));
}

export async function handlePreToolUse(input: PreToolUseInput, output: any): Promise<void> {
  const toolName = input.tool || process.env.TOOL_NAME || process.env.HOOK_TOOL || '';
  const toolArgs = input.args ? (typeof input.args === 'string' ? input.args : JSON.stringify(input.args)) : process.env.HOOK_ARGS || '';

  frameworkLogger.log('grok-hook', 'pre-tool-use', 'info', {
    tool: toolName,
    message: '0xRay PreToolUse hook triggered'
  });

  const resonance = deriveResonance(toolName, toolArgs);

  let govResult: { recommendation: string } = { recommendation: 'allow' };
  try {
    const { applyDecisionMatrix } = await import('../../../governance/governance-core.js');
    govResult = applyDecisionMatrix({ resonance, isotopicRatio: 0.5 });
  } catch {
    govResult = { recommendation: resonance >= 0.75 ? 'allow' : 'flag' };
  }

  if (resonance < 0.4) {
    output.decision = 'block';
    output.reason = `Blocked by 0xRay governance (resonance: ${resonance.toFixed(2)})`;
    frameworkLogger.log('grok-hook', 'pre-tool-use-blocked', 'warning', {
      tool: toolName,
      resonance
    });
  } else {
    output.decision = 'allow';
  }

  const result = {
    resonance: Math.round(resonance * 100) / 100,
    solar_recommendation: govResult.recommendation,
    gov: govResult,
    tool: toolName,
    decision: output.decision,
    reason: output.reason || '',
  };
  console.log(JSON.stringify(result));
}

export default handlePreToolUse;
