import fs from 'node:fs';
import path from 'node:path';

const LEGACY_BENCH_TOKEN = ['kiln', 'app', '6N2R'].join('-');

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) listFiles(full, acc);
    else if (/\.(mjs|js|md)$/.test(name)) acc.push(full);
  }
  return acc;
}

/**
 * @param {string} root project root
 * @param {{ skip?: string[] }} [opts]
 */
export function assertNoBakedBenchToken(root, opts = {}) {
  const skip = new Set(opts.skip ?? []);
  const targets = [
    ...listFiles(path.join(root, 'lib')),
    ...listFiles(path.join(root, 'bin')),
    ...listFiles(path.join(root, 'test')),
    path.join(root, 'README.md'),
  ].filter((p) => fs.existsSync(p) && !skip.has(p));

  for (const file of targets) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes(LEGACY_BENCH_TOKEN)) {
      throw new Error(`baked legacy bench token in ${path.relative(root, file)}`);
    }
    if (/export const BENCH_LESSON\s*=/.test(text)) {
      throw new Error(`exported BENCH_LESSON constant in ${path.relative(root, file)}`);
    }
  }
}
