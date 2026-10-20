// #292: a build straight from git (no assembled collector/) must fail loudly; deploy.sh assembles via one script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const docker = fs.readFileSync(path.join(APP, 'Dockerfile'), 'utf8');
const guard = docker.split('\n').reduce((acc, line, i, all) => acc ?? (line.startsWith('RUN test -f collector/') ? (line + '\n' + all[i + 1]).replace(/^RUN /, '') : null), null);

function runGuard(dir) {
  return spawnSync('sh', ['-c', guard], { cwd: dir, encoding: 'utf8' });
}

test('Dockerfile guards collector/ right after copying it', () => {
  assert.ok(guard, 'guard RUN line present');
  assert.ok(docker.indexOf('COPY collector ./collector') < docker.indexOf('RUN test -f collector/'));
});

test('git-only checkout: guard fails with the deploy.sh message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-git-'));
  fs.mkdirSync(path.join(dir, 'collector'));
  fs.copyFileSync(path.join(APP, 'collector', 'README.md'), path.join(dir, 'collector', 'README.md'));
  const r = runGuard(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Deploy only via house\/live\/app\/deploy\.sh/);
});

test('assemble-collector.sh output passes the guard and holds every shipped file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-asm-'));
  execFileSync(path.join(APP, 'assemble-collector.sh'), [dir]);
  const c = path.join(dir, 'collector');
  for (const f of ['upstream/fetch_feed.py', 'live_mesh.py', 'inbox_pass.py', 'deploy_status.py', 'host_poll.py', 'fleet-roster.json', 'fleet-nodes.json',
    'site.json', 'routing/inbox.py', 'routing/board.py', 'routing/inbox-roles.json', 'README.md']) {
    assert.ok(fs.existsSync(path.join(c, f)), f);
  }
  assert.equal(runGuard(dir).status, 0);
  execFileSync(path.join(APP, 'assemble-collector.sh'), [dir]);   // idempotent re-run
  assert.equal(runGuard(dir).status, 0);
  const missing = missingLocalImports(c);
  assert.deepEqual(missing, [], missing.join('\n'));
});

function missingLocalImports(collectorDir) {
  const script = [
    'import ast, json, sys',
    'from pathlib import Path',
    'root = Path(sys.argv[1]).resolve()',
    'stdlib = set(sys.stdlib_module_names)',
    'stems = {p.stem for p in root.rglob("*.py")}',
    'missing = []',
    'for path in sorted(root.rglob("*.py")):',
    '    tree = ast.parse(path.read_text())',
    '    for node in ast.walk(tree):',
    '        names = []',
    '        if isinstance(node, ast.Import):',
    '            names = [a.name.split(".")[0] for a in node.names]',
    '        elif isinstance(node, ast.ImportFrom):',
    '            if node.level:',
    '                base = path.parent',
    '                for _ in range(node.level - 1):',
    '                    base = base.parent',
    '                mods = [node.module] if node.module else [a.name for a in node.names]',
    '                for mod in mods:',
    '                    cand = base.joinpath(*mod.split("."))',
    '                    if not (cand.with_suffix(".py").is_file() or (cand / "__init__.py").is_file()):',
    '                        missing.append(f"{path.relative_to(root)}:{mod}")',
    '                continue',
    '            if node.module:',
    '                names = [node.module.split(".")[0]]',
    '        else:',
    '            continue',
    '        for name in names:',
    '            if name in stdlib or name in stems:',
    '                continue',
    '            missing.append(f"{path.relative_to(root)}:{name}")',
    'print(json.dumps(sorted(set(missing))))',
  ].join('\n');
  const r = spawnSync('python3', ['-c', script, collectorDir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('deploy.sh assembles through the shared script', () => {
  assert.match(fs.readFileSync(path.join(APP, 'deploy.sh'), 'utf8'), /"\$APP\/assemble-collector\.sh" "\$DST"/);
});
