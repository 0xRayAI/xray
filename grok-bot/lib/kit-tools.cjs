'use strict';
// `grok-bot live-inbox <seat> ...` and `grok-bot exit-gate <NOTES.md>`: the board tools a seat runs, shipped in the
// npm kit (xray#1071). prepack copies live-inbox, exit-gate.mjs, packet-body.mjs, and cloud_line.py into lib/;
// a repo checkout falls back to house/live/tools. Same args, env and exit codes as the repo tools.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOLS = {
  'live-inbox': { packed: 'live-inbox.py', repo: 'live-inbox', run: (env) => env.PYTHON || 'python3' },
  'exit-gate': { packed: 'exit-gate.mjs', repo: 'exit-gate.mjs', run: () => process.execPath },
};

function toolScript(kitRoot, name) {
  const tool = TOOLS[name];
  const packed = path.join(kitRoot, 'lib', tool.packed);
  if (fs.existsSync(packed)) return packed;
  const repo = path.join(kitRoot, '..', 'house', 'live', 'tools', tool.repo);
  return fs.existsSync(repo) ? repo : null;
}

function runKitTool(name, argv, io = {}) {
  const stderr = io.stderr || process.stderr;
  const kitRoot = io.kitRoot || path.resolve(__dirname, '..');
  const script = toolScript(kitRoot, name);
  if (!script) {
    stderr.write(`${name} is missing from this kit (lib/${TOOLS[name].packed})\n`);
    return 1;
  }
  const env = io.env || process.env;
  const bin = TOOLS[name].run(env);
  const r = spawnSync(bin, [script, ...argv], { stdio: io.stdio || 'inherit', env, cwd: io.cwd });
  if (r.error) {
    stderr.write(`${name} needs ${bin} on PATH (${r.error.code || r.error.message})\n`);
    return 1;
  }
  return r.status === null ? 1 : r.status;
}

module.exports = { runKitTool, toolScript, KIT_TOOLS: Object.keys(TOOLS) };
