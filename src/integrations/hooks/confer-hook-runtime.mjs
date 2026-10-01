#!/usr/bin/env node
/**
 * Lazy-load confer SSOT for Grok session-boot hints.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolvePackageRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const require = createRequire(join(dir, 'package.json'));
        if (require('./package.json').name === '0xray') return dir;
      } catch {
        /* continue */
      }
    }
    const nm = join(dir, 'node_modules', '0xray', 'package.json');
    if (existsSync(nm)) return dirname(nm);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(__dirname, '../../..');
}

function loadConfer() {
  const root = resolvePackageRoot();
  const candidates = [
    join(__dirname, '../../nucleus/confer.js'),
    join(root, 'dist/nucleus/confer.js'),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/confer.js'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) return null;
  return createRequire(import.meta.url)(found);
}

export function isConferPendingForSession(projectRoot, sessionId = null) {
  const mod = loadConfer();
  if (!mod?.isConferPending) return false;
  return mod.isConferPending(projectRoot, sessionId);
}

/** 'UNREVIEWED' when a consult receipt recorded abstain-without-model. */
export function readConferReviewHint(projectRoot) {
  const stateDir = join(projectRoot, '.xray', 'state');
  if (!existsSync(stateDir)) return null;
  let names;
  try {
    names = readdirSync(stateDir);
  } catch {
    return null;
  }
  for (const name of names) {
    if (!name.startsWith('synthesis-consult-') || !name.endsWith('.json')) continue;
    try {
      const receipt = JSON.parse(readFileSync(join(stateDir, name), 'utf8'));
      if (receipt && receipt.verdict === 'UNREVIEWED') return 'UNREVIEWED';
    } catch {
      /* unreadable receipt is not a hint */
    }
  }
  return null;
}