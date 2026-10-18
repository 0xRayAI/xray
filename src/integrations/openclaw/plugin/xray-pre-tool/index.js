import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';

const require = createRequire(import.meta.url);
const pluginDir = dirname(fileURLToPath(import.meta.url));

function hasGate(root) {
  return Boolean(root) && existsSync(join(root, 'dist/nucleus/delegation-gate.js'));
}

function resolveXrayRoot() {
  if (hasGate(process.env.XRAY_AI_PATH || '')) {
    return process.env.XRAY_AI_PATH;
  }
  const marker = join(homedir(), '.openclaw', 'xray-consumer-root.txt');
  const marked = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : '';
  const candidates = [
    marked,
    marked ? join(marked, 'node_modules', '0xray') : '',
    marked ? join(marked, '..', 'xray') : '',
    // Linked plugin lives at src/integrations/openclaw/plugin/xray-pre-tool
    join(pluginDir, '..', '..', '..', '..', '..'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (hasGate(candidate)) {
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
      async (event, ctx) => {
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
          const spoken = `${event.toolName} ${JSON.stringify(event.params || {})}`.slice(0, 500);
          const speakPath = [
            join(xrayRoot, 'dist/integrations/hooks/pre-tool-speak.mjs'),
            join(xrayRoot, 'src/integrations/hooks/pre-tool-speak.mjs'),
          ].find((candidate) => existsSync(candidate));
          if (!speakPath) return undefined;
          const speak = await import(pathToFileURL(speakPath).href);
          const lens = speak.lensDecision(projectRoot, event.toolName, spoken);
          if (lens?.decision === 'deny') {
            return { block: true, blockReason: lens.reason };
          }
          if (lens?.reason) {
            return {
              block: false,
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                additionalContext: lens.reason,
              },
            };
          }
          const route = speak.repertoireRoute(spoken);
          if (route?.hookSpecificOutput) {
            return { block: false, hookSpecificOutput: route.hookSpecificOutput };
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
