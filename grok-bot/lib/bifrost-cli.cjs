'use strict';
// `grok-bot bifrost init [--check] [...]`: the board's seat-route setup, shipped in the npm kit (#1050).
// Runs house/live/tools/bifrost-init (packed as lib/bifrost-init.py). The feed dir defaults to ./collector,
// the layout of a 0xRayAI/bifrost clone; BIFROST_FEED or --routing-dir / --nodes override it.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function initScript(kitRoot) {
  // Prefer the checkout copy. prepack writes lib/bifrost-init.py and postpack
  // removes it, so a parallel test must not launch that temporary file.
  const repo = path.join(kitRoot, '..', 'house', 'live', 'tools', 'bifrost-init');
  if (fs.existsSync(repo)) return repo;
  const packed = path.join(kitRoot, 'lib', 'bifrost-init.py');
  return fs.existsSync(packed) ? packed : null;
}

function runBifrostCli(argv, io = {}) {
  const stderr = io.stderr || process.stderr;
  const kitRoot = io.kitRoot || path.resolve(__dirname, '..');
  if (argv[0] !== 'init') {
    stderr.write('usage: grok-bot bifrost init [--check] [--seats a,b] [--logins a=login,...] [--yes]\n');
    return 2;
  }
  const script = initScript(kitRoot);
  if (!script) {
    stderr.write('bifrost init is missing from this kit (lib/bifrost-init.py)\n');
    return 1;
  }
  const env = { ...process.env };
  if (!env.BIFROST_FEED) env.BIFROST_FEED = path.resolve(io.cwd || process.cwd(), 'collector');
  const py = env.PYTHON || 'python3';
  const r = spawnSync(py, [script, ...argv.slice(1)], { stdio: io.stdio || 'inherit', env, cwd: io.cwd });
  if (r.error) {
    stderr.write(`bifrost init needs ${py} on PATH (${r.error.code || r.error.message})\n`);
    return 1;
  }
  return r.status === null ? 1 : r.status;
}

module.exports = { runBifrostCli };
