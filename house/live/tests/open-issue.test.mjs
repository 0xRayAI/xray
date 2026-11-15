import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(new URL('../tools/open-issue', import.meta.url));

function run(args) {
  return spawnSync(process.execPath, [TOOL, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH || '', HOME: '/tmp' },
    timeout: 20000,
  });
}

test('open-issue writes a packet and defaults A to forge', () => {
  const proc = run([
    '--repo', 'org/app', '--title', 'Needs a card', '--seat', 'arch1',
    '--body', 'The board has no R.\n',
  ]);
  assert.equal(proc.status, 1, proc.stderr);
  assert.match(proc.stdout, /handoff for forge/);
  assert.match(proc.stdout, /title: Needs a card/);
  assert.match(proc.stdout, /## Packet\nraci: R=arch1 A=forge\n/);
});

test('open-issue keeps a packet that already names R and A', () => {
  const proc = run([
    '--repo', 'org/app', '--title', 'Named', '--seat', 'mill', '--a', 'blinky',
    '--body', '## Packet\nraci: R=near A=critic\n',
  ]);
  assert.match(proc.stdout, /raci: R=near A=critic/);
  assert.doesNotMatch(proc.stdout, /R=mill/);
});
