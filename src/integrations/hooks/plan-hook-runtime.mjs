#!/usr/bin/env node
/**
 * Load lead-dev plan persistence from consumer or package dist.
 * Used by Grok/Hermes session-start for stale plan archival.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
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
        const name = require('./package.json').name;
        if (name === '0xray') return dir;
      } catch {
        /* continue */
      }
    }
    const nm = join(dir, 'node_modules', '0xray', 'package.json');
    if (existsSync(nm)) {
      return dirname(nm);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(__dirname, '../../..');
}

function loadPlanPersistence() {
  const root = resolvePackageRoot();
  const candidates = [
    join(__dirname, '../../nucleus/lead-dev-plan-persistence.js'),
    join(root, 'dist/nucleus/lead-dev-plan-persistence.js'),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/lead-dev-plan-persistence.js'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'lead-dev-plan-persistence.js missing — run npm run build in 0xray',
    );
  }
  return createRequire(import.meta.url)(found);
}

let persistence;

function getPersistence() {
  if (!persistence) {
    persistence = loadPlanPersistence();
  }
  return persistence;
}

export function archiveStaleLeadDevPlan(projectRoot) {
  return getPersistence().archiveStaleLeadDevPlan(projectRoot);
}

export function isLeadDevPlanStale(plan, projectRoot) {
  return getPersistence().isLeadDevPlanStale(plan, projectRoot);
}