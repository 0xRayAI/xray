#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
process.chdir(root);
const files = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(Boolean);
const globs = readFileSync('.ci/data-allowlist', 'utf8').split('\n')
  .map((line) => line.replace(/#.*$/, '').trim()).filter(Boolean)
  .map((glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*')}$`));
const exempt = (file) => globs.some((re) => re.test(file));
const skipPkg = /^(vendor|examples|tests|docs-site)\//;
const published = new Set(['package-lock.json']);
for (const file of files) {
  if (!file.endsWith('package.json') || skipPkg.test(file)) continue;
  if (/"private"\s*:\s*true/.test(readFileSync(file, 'utf8'))) continue;
  published.add(`${file.slice(0, -'package.json'.length)}package-lock.json`);
}
const bad = [];
const counts = new Map();
for (const file of files) {
  if (exempt(file)) continue;
  const base = file.slice(file.lastIndexOf('/') + 1);
  if (/\.(log|out)$/.test(base)) bad.push(`${file} matches *.log or *.out`);
  if (/(^|\/)rerun[-_][^/]*\//.test(file)) bad.push(`${file} is inside a rerun dir`);
  if (base === 'package-lock.json' && !published.has(file)) bad.push(`${file} is a nested package-lock.json`);
  if (file.startsWith('examples/') && statSync(file).size > 100 * 1024) bad.push(`${file} is over 100KB`);
  const name = file.startsWith('examples/') ? file.split('/')[1] : '';
  if (name) counts.set(name, (counts.get(name) || 0) + 1);
}
for (const [name, count] of counts) {
  if (count > 20) bad.push(`examples/${name}/ has ${count} files (max 20)`);
}
if (bad.length) {
  process.stderr.write(`data check failed\n${bad.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`data check passed (${files.length} tracked files)\n`);
