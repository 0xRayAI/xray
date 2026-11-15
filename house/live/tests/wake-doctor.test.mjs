import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { flagWakeEntrypoints } from '../tools/wake-doctor.mjs';

function checkout() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'wake-doctor-'));
  const bin = path.join(root, 'house', 'live', 'tools');
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, 'live-inbox'), '#!/usr/bin/env python3\n# main\n');
  return root;
}

test('the main live-inbox and a symlink to it pass', () => {
  const root = checkout();
  const canonical = path.join(root, 'house', 'live', 'tools', 'live-inbox');
  const link = path.join(root, 'bin-link');
  symlinkSync(canonical, link);
  assert.deepEqual(flagWakeEntrypoints(root, [canonical, link]), []);
});

test('a copied wake script and a foreign live-inbox are flagged', () => {
  const root = checkout();
  const copy = path.join(root, 'blinky-wake.sh');
  writeFileSync(copy, '#!/bin/sh\nbin=/home/box/bin/live-inbox\n"$bin" "$seat"\n');
  const wrapper = path.join(root, 'ok-wake.sh');
  writeFileSync(wrapper, '#!/bin/sh\nexec "$XRAY_MAIN/house/live/tools/live-inbox" "$1"\n');
  const bad = flagWakeEntrypoints(root, [copy, wrapper]);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].file, copy);
  assert.match(bad[0].why, /\/home\/box\/bin\/live-inbox/);
});
