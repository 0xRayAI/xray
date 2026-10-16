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
  findPlatesDir,
  growPlane,
  lensBeforeResearch,
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
  for (const id of ['dev', 'integration', 'domain', 'ecosystem']) {
    const text = look([id]).text;
    const files = (text.match(/^Files: (.+)$/m) || [, ''])[1].split(',').map((item) => item.trim()).filter(Boolean);
    const missing = files.filter((rel) => !existsSync(join(repo, rel)));
    check(
      `${id} card`,
      text.includes(`Plane: ${id}`) && text.includes('Entry:') && text.includes('Exit:') && files.length > 0 && missing.length === 0,
      missing.join(', ') || files[0],
    );
  }
  check('a worn name asks for one plane', look(['dichotomy']).text === 'Name one plane.');
  const synthesis = look(['synthesis']).text;
  check(
    'a missing plate names the stamp skill',
    synthesis.includes('Card: synthesis') && synthesis.includes('.agents/skills/stamp-plate/SKILL.md') && !existsSync(join(repo, 'docs-site/docs/plates/synthesis.md')),
  );


  const held = mkdtempSync(join(tmpdir(), 'goggles-observer-hold-'));
  try {
    const search = lensBeforeResearch(held, 'grep', 'find the login bug');
    check('a search returns the dev card', search?.decision === 'deny' && String(search.reason).includes('Plane: dev') && String(search.reason).includes('Entry:'));
    check('git and npm stay open', lensBeforeResearch(held, 'bash', 'git status') === null && lensBeforeResearch(held, 'bash', 'npm test') === null);
    check('a file on the current plane stays quiet', lensBeforeResearch(held, 'read_file', 'README.md') === null);
    const hop = lensBeforeResearch(held, 'read_file', 'src/nucleus/thin-dispatch.ts');
    check(
      'another plane switches and stays open',
      hop?.decision === 'allow' && String(hop.reason).includes('Card: routing') && String(hop.reason).includes('Plane: integration'),
    );
    const next = lensBeforeResearch(held, 'grep', 'still looking');
    check('the next search uses the card it is on', next?.decision === 'deny' && String(next.reason).includes('Card: routing'));
    const stray = lensBeforeResearch(held, 'read_file', 'CHANGELOG.md');
    check('a file on no plane keeps the current card', stray?.decision === 'allow' && String(stray.reason).includes('Card: routing'));
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
  check('a look with no plane asks for one', suitHint('look') === 'Name one plane.');
} finally {
  rmSync(state, { recursive: true, force: true });
}

if (fails.length) {
  process.stderr.write(`${fails.length} failed\n`);
  process.exit(1);
}
process.stdout.write('observer clear\n');
