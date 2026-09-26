#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(root);

const toRegExp = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*')}$`);
const fullExempt = [];
const countExempt = [];
for (const line of readFileSync('.ci/data-allowlist', 'utf8').split('\n')) {
  const text = line.replace(/#.*$/, '').trim();
  if (!text) continue;
  if (text.startsWith('count:')) countExempt.push(toRegExp(text.slice('count:'.length).trim()));
  else fullExempt.push(toRegExp(text));
}
const matches = (list, file) => list.some((re) => re.test(file));

function violations() {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
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
    if (matches(fullExempt, file)) continue;
    const base = file.slice(file.lastIndexOf('/') + 1);
    if (/\.(log|out)$/.test(base)) bad.push(`${file} matches *.log or *.out`);
    if (/(^|\/)rerun[-_][^/]*\//.test(file)) bad.push(`${file} is inside a rerun dir`);
    if (base === 'package-lock.json' && !published.has(file)) bad.push(`${file} is a nested package-lock.json`);
    if (file.startsWith('examples/') && statSync(file).size > 100 * 1024) bad.push(`${file} is over 100KB`);
    const name = file.startsWith('examples/') ? file.split('/')[1] : '';
    if (name && !matches(countExempt, file)) counts.set(name, (counts.get(name) || 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 20) bad.push(`examples/${name}/ has ${count} files (max 20)`);
  }
  return bad;
}

function report(bad) {
  if (bad.length) {
    process.stderr.write(`data check failed\n${bad.join('\n')}\n`);
    return 1;
  }
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).length;
  process.stdout.write(`data check passed (${tracked} tracked files)\n`);
  return 0;
}

const probe = 'examples/ben-proof/suited/rerun-9/run.log';

function selfCheck() {
  const abs = path.join(root, probe);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.alloc(300 * 1024));
  let text = '';
  let status = 0;
  try {
    execFileSync('git', ['add', '-f', '--', probe]);
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: 'utf8' });
    status = child.status ?? 1;
    text = `${child.stdout ?? ''}${child.stderr ?? ''}`;
  } finally {
    spawnSync('git', ['reset', '-q', 'HEAD', '--', probe]);
    rmSync(path.dirname(abs), { recursive: true, force: true });
  }
  process.stdout.write(text);
  const rejected = status !== 0
    && text.includes(`${probe} matches *.log or *.out`)
    && text.includes(`${probe} is inside a rerun dir`)
    && text.includes(`${probe} is over 100KB`);
  if (!rejected) {
    process.stderr.write('self-check failed: 300KB run.log under suited/rerun-9/ was not rejected\n');
    return 1;
  }
  process.stdout.write('self-check passed: 300KB run.log under examples/ben-proof/suited/rerun-9/ was rejected\n');
  return 0;
}

process.exit(process.argv[2] === '--self-check' ? selfCheck() : report(violations()));
