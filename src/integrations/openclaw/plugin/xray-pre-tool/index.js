import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';

const require = createRequire(import.meta.url);

function resolveXrayRoot() {
  if (process.env.XRAY_AI_PATH && existsSync(join(process.env.XRAY_AI_PATH, 'dist/nucleus/delegation-gate.js'))) {
    return process.env.XRAY_AI_PATH;
  }
  const marker = join(homedir(), '.openclaw', 'xray-consumer-root.txt');
  const marked = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : '';
  const candidates = [
    marked,
    marked ? join(marked, 'node_modules', '0xray') : '',
    marked ? join(marked, '..', 'xray') : '',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'dist/nucleus/delegation-gate.js'))) {
      return candidate;
    }
  }
  return '';
}

export default definePluginEntry({
  id: 'xray-pre-tool',
  name: '0xRay PreToolUse',
  register(api) {
    api.on(
      'before_tool_call',
      (event, ctx) => {
        try {
          const xrayRoot = resolveXrayRoot();
          if (!xrayRoot) {
            return { block: true, blockReason: '0xRay dist missing — set XRAY_AI_PATH' };
          }
          const gate = require(join(xrayRoot, 'dist/nucleus/delegation-gate.js'));
          const projectRoot =
            process.env.XRAY_ROOT ||
            ctx?.workspaceDir ||
            ctx?.cwd ||
            process.cwd();
          const features = gate.loadDelegationGateFeatures(projectRoot, 'openclaw');
          const outcome = gate.evaluatePreToolGate(event.toolName, event.params || {}, {
            projectRoot,
            sessionId: ctx?.sessionId || ctx?.sessionKey || 'openclaw',
            features,
            host: 'openclaw',
          });
          if (!outcome.allow) {
            return { block: true, blockReason: outcome.reason || '0xRay constitution' };
          }
          return undefined;
        } catch (err) {
          return {
            block: true,
            blockReason: err instanceof Error ? err.message : String(err),
          };
        }
      },
      { priority: 80 },
    );
  },
});
