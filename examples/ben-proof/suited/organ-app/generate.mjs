import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lawsDir = path.join(here, 'laws');
const FILE_COUNT = 450;
const TARGET_LINES = 230;

const CLAUSES = [
  'MemoryRoutingProvider.buildRoutingContext matches operation text to named laws.',
  'LESSON_TEXT_CAP keeps one graded lesson line at 400 characters.',
  'LESSON_LINE_CAP keeps twenty hot lines; older task ids sit in retained_lesson_ids.',
  'recordLesson coins a hyphenated name when the task text matches no existing law.',
  'A lesson with no match and no text does not write.',
  'Success steps conviction up by 0.1. Failure steps it down by 0.1.',
  'The promotion floor is 0.55. Float dust just under the floor still passes.',
  'Excess above 0.55 decays after 14 grace days with a 60 day half-life.',
  'A stored score on the floor is not demoted by calendar age.',
  'Factory seed primitives stay. Project-local signals can lose validated under the gate.',
  'An ontological trap with confidence above the floor adds 10 plus 10 times max confidence.',
  'Excess of the max confidence above the floor adds 20 times that excess to complexity.',
  'resolveThinDispatch may replace the tier agent when a trap recommends architect.',
  'selectAgent runs at plan time, when required capabilities are already known.',
  'scoreAndRoute only has an operation string and a complexity score.',
  'Inherited context carries matched laws into an aside. It does not copy the factory seed.',
  'Writable dest is .xray/state/repertoire/curated_signals.json. The package seed stays immutable.',
  'Hydrate copies the seed into dest, then stack and subject overlays apply.',
  'Station heat grows dest from the kernel diary without opening data/lessons.jsonl.',
  'Host preCompact proof needs generation_id and a numeric context_usage_percent.',
  'A token count alone is not a host cut. Synthetic stdin stays cursor-precompact-synthetic.',
  'The receipt pair is cursor-hook.log plus cursor-receipts for the same session id.',
  'Nested wear roots under examples are discovered at compact time because stdin has no Read paths.',
  'thinDispatch tiers: 15 code-reviewer, 25 researcher, 50 architect, above that orchestrator.',
  'Trap-capable agents are architect, security-auditor, and researcher.',
  'Inference types include ontological-trap, temporal-drift, and provenance-failure.',
  'Signal status moves proposed, validated, integrated, deprecated.',
  'Observation stats count only samples strictly above the 0.55 gate as evidence.',
  'Speech mints are capped. Learned conviction lives in a sidecar, not in the seed file.',
  'The suited wear task coins the signal compaction-memory-bench-suited-arm.',
];

const TAGS = [
  'inference',
  'governance',
  'engine',
  'station',
  'lesson',
  'decay',
  'dispatch',
  'memory',
  'compaction',
  'ontological-trap',
];

rmSync(lawsDir, { recursive: true, force: true });
mkdirSync(lawsDir, { recursive: true });

function lawBody(index) {
  const id = String(index).padStart(4, '0');
  const name = `law-${id}`;
  const tags = [TAGS[index % TAGS.length]];
  if (index % 17 === 0) tags.push('memory');
  if (index % 19 === 0) tags.push('compaction');
  if (index % 23 === 0) tags.push('ontological-trap');
  const stored = index % 11 === 0 ? 0.55 : index % 5 === 0 ? 0.4 : Number((0.56 + (index % 40) / 100).toFixed(2));
  const ageDays = (index * 3) % 120;
  const lastSeen = new Date(Date.UTC(2026, 0, 1) + ageDays * 86400000).toISOString();
  const priority = index % 3 === 0 ? 'high' : index % 3 === 1 ? 'medium' : 'low';
  const lines = [];
  lines.push('/**');
  lines.push(` * ${name} — research law distilled from the 0xRay memory organ and repertoire registry.`);
  lines.push(' */');
  lines.push('export const law = {');
  lines.push(`  name: ${JSON.stringify(name)},`);
  lines.push(`  definition: ${JSON.stringify(CLAUSES[index % CLAUSES.length])},`);
  lines.push(`  tags: ${JSON.stringify(tags)},`);
  lines.push(`  priority: ${JSON.stringify(priority)},`);
  lines.push(`  storedConfidence: ${stored},`);
  lines.push(`  lastSeen: ${JSON.stringify(lastSeen)},`);
  lines.push(`  observationCount: ${10 + (index % 90)},`);
  lines.push('  lessons: [');
  for (let row = 0; row < 12; row += 1) {
    const decision = row % 7 === 0 ? 'failure' : 'success';
    const text = `${CLAUSES[(index + row) % CLAUSES.length]} Law ${id} turn ${row}.`;
    lines.push(
      `    { taskId: ${JSON.stringify(`organ:${id}:${row}`)}, decision: ${JSON.stringify(decision)}, text: ${JSON.stringify(text)}, at: ${JSON.stringify(lastSeen)} },`,
    );
  }
  lines.push('  ],');
  lines.push('  notes: [');
  while (lines.length < TARGET_LINES - 2) {
    const clause = CLAUSES[(index + lines.length) % CLAUSES.length];
    lines.push(`    ${JSON.stringify(`${name} note ${lines.length}: ${clause}`)},`);
  }
  lines.push('  ],');
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

for (let i = 0; i < FILE_COUNT; i += 1) {
  const id = String(i).padStart(4, '0');
  writeFileSync(path.join(lawsDir, `law-${id}.mjs`), lawBody(i));
}

process.stdout.write(`wrote ${FILE_COUNT} laws\n`);
