#!/usr/bin/env node
/**
 * Watch the five checks. Exit 1 when any fails.
 * Run from the worktree: node scripts/mjs/goggles-observer.mjs
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cardStop,
  findPlatesDir,
  growPlane,
  handCard,
  look,
  suitHint,
} from '../../src/integrations/hooks/goggles-pipeline.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const fails = [];

function check(name, ok, detail) {
  const line = `${ok ? 'pass' : 'fail'}  ${name}${detail ? ` — ${detail}` : ''}`;
  process.stdout.write(`${line}\n`);
  if (!ok) fails.push(name);
}

const planes = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting'];
for (const id of planes) {
  const text = look(['digest', id]).text;
  const files = (text.match(/^Files: (.+)$/m) || [, ''])[1].split(',').map((item) => item.trim()).filter(Boolean);
  const missing = files.filter((rel) => !existsSync(join(root, rel)));
  check(`${id} file`, files.length > 0 && missing.length === 0, files.join(', ') || 'none');
}

const synthesis = look(['synthesis']).text;
check('synthesis file', synthesis.includes('src/nucleus/synthesis.ts'), synthesis);
check('dichotomy stays a reading', look(['dichotomy']).text === 'The reading is dichotomy.', look(['dichotomy']).text);

const held = mkdtempSync(join(tmpdir(), 'goggles-observer-'));
try {
  handCard(held, 'please triage this bug');
  const casual = cardStop(held, 'grep', 'check the loop', []);
  check('casual triage does not arm', casual == null, casual && casual.reason);
  handCard(held, 'name dichotomy');
  handCard(held, 'is it useful');
  const stayed = cardStop(held, 'read_file', 'docs-site/docs/plates/routing.md', ['docs-site/docs/plates/routing.md']);
  check('ordinary sentence does not drop the hold', stayed && stayed.decision === 'deny', stayed && stayed.reason);
} finally {
  rmSync(held, { recursive: true, force: true });
}

const scratch = mkdtempSync(join(tmpdir(), 'goggles-observer-view-'));
try {
  writeFileSync(join(scratch, 'placeholder'), '');
  const viewRoot = mkdtempSync(join(tmpdir(), 'goggles-observer-state-'));
  writeFileSync(join(viewRoot, 'skip'), '');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(join(viewRoot, '.xray', 'state'), { recursive: true });
  writeFileSync(join(viewRoot, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({ boot: { files: ['src/missing.ts'] } })}\n`);
  const boot = growPlane('boot', findPlatesDir(root), viewRoot);
  check('stale file is replaced', boot.files.includes('src/core/boot-orchestrator.ts') && !boot.files.includes('src/missing.ts'), boot.files.join(', '));
  rmSync(viewRoot, { recursive: true, force: true });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const hint = suitHint('open the boot plane');
check('suit hint names the boot file', hint.includes('src/core/boot-orchestrator.ts'), hint);

if (fails.length) {
  process.stderr.write(`${fails.length} failed\n`);
  process.exit(1);
}
process.stdout.write('observer clear\n');
