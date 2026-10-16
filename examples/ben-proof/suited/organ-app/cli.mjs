import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLaws } from './src/registry.mjs';
import { resolveThinDispatch } from './src/dispatch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const task = process.argv.slice(2).join(' ').trim() || 'memory routing research';
const laws = await loadLaws(path.join(here, 'laws'));
const routed = resolveThinDispatch(task, 11, laws);

process.stdout.write(`${JSON.stringify({
  laws: laws.length,
  agent: routed.agent,
  adjustedScore: routed.adjustedScore,
  matched: routed.context.matchedSignals.length,
  avgConfidence: Number(routed.context.avgConfidence.toFixed(4)),
  maxConfidence: Number(routed.context.maxConfidence.toFixed(4)),
  complexityBoost: routed.context.complexityBoost,
  ontologicalTrapDetected: routed.context.ontologicalTrapDetected,
}, null, 2)}\n`);
