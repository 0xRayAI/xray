#!/usr/bin/env node
/**
 * Five checks for the organ. Exit 1 when any fails.
 * node scripts/mjs/goggles-observer.mjs
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

const repo = fileURLToPath(new URL('../..', import.meta.url));
const state = mkdtempSync(join(tmpdir(), 'goggles-observer-state-'));
process.env.GOGGLES_ROOT = state;

const fails = [];

function check(name, ok, detail) {
  process.stdout.write(`${ok ? 'pass' : 'fail'}  ${name}${detail ? ` — ${detail}` : ''}\n`);
  if (!ok) fails.push(name);
}

try {
  const planes = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting'];
  for (const id of planes) {
    const text = look(['digest', id]).text;
    const files = (text.match(/^Files: (.+)$/m) || [, ''])[1].split(',').map((item) => item.trim()).filter(Boolean);
    const missing = files.filter((rel) => !existsSync(join(repo, rel)));
    check(`${id} file`, files.length > 0 && missing.length === 0, files.join(', ') || 'none');
  }

  const synthesis = look(['synthesis']).text;
  check('synthesis file', synthesis.includes('src/nucleus/synthesis.ts'), synthesis);
  check('dichotomy stays a reading', look(['dichotomy']).text === 'The reading is dichotomy.');

  const held = mkdtempSync(join(tmpdir(), 'goggles-observer-hold-'));
  try {
    handCard(held, 'please triage this bug');
    const casual = cardStop(held, 'grep', 'check the loop', []);
    check('casual triage does not arm', casual === null);
    handCard(held, 'name dichotomy');
    handCard(held, 'is it useful');
    const stayed = cardStop(held, 'read_file', 'docs-site/docs/plates/routing.md', ['docs-site/docs/plates/routing.md']);
    check('ordinary sentence does not drop the hold', Boolean(stayed && stayed.decision === 'deny'));
  } finally {
    rmSync(held, { recursive: true, force: true });
  }

  mkdirSync(join(state, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(state, '.xray', 'state', 'goggles-views.json'),
    `${JSON.stringify({ boot: { files: ['src/missing.ts'] } })}\n`,
  );
  const boot = growPlane('boot', findPlatesDir(repo), state);
  const files = Array.isArray(boot.files) ? boot.files : [];
  check(
    'stale file is replaced',
    files.includes('src/core/boot-orchestrator.ts') && !files.includes('src/missing.ts'),
    files.join(', '),
  );
  check('suit hint names the boot file', suitHint('open the boot plane').includes('src/core/boot-orchestrator.ts'));
  const house = look(['digest', 'house']).text;
  check('house doors', house.includes('Entry: EMPTY') && house.includes('Setup: no house/ folder yet'), house.split('\n').filter((line) => /^(Entry|Exit|Setup|Teardown):/.test(line)).join(' | '));
  const memory = look(['digest', 'memory-recall']).text;
  check('memory worn twin', memory.includes('Worn: dist/integrations/hooks/plates.cjs'));
  check('two planes both files', suitHint('routing and governance').includes('routing:') && suitHint('routing and governance').includes('governance:'));
  check('a look with no plane asks for one', suitHint('look') === 'Name one plane.');
} finally {
  rmSync(state, { recursive: true, force: true });
}

if (fails.length) {
  process.stderr.write(`${fails.length} failed\n`);
  process.exit(1);
}
process.stdout.write('observer clear\n');
