#!/usr/bin/env node
/**
 * Lazy-load user-aside SSOT for Grok session-boot hints.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

async function loadUserAside() {
  const root = resolvePackageRoot();
  const candidates = [
    join(__dirname, '../../nucleus/user-aside.js'),
    join(root, 'dist/nucleus/user-aside.js'),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/user-aside.js'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) return null;
  try {
    return await import(pathToFileURL(found).href);
  } catch {
    return null;
  }
}

const userAside = await loadUserAside();

export function getActiveUserAsideBoot(projectRoot, sessionId = null) {
  if (!userAside?.getUserAsideBootHints) return null;
  return userAside.getUserAsideBootHints(projectRoot, sessionId);
}