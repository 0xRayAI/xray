#!/usr/bin/env node
"use strict";
/**
 * Start an MCP server with an allowlisted environment.
 *
 *   node mcp-launch.cjs --keep PATH,HOME,XRAY_ROOT[,NAME...] -- <cmd> [args...]
 *
 * argv carries names only. The host merges the config `env` block onto this
 * process, so values come from the live environment. The child receives
 * process.env filtered to those names. stdio is inherited. Signals and the
 * exit code are forwarded.
 */
const { spawn } = require("child_process");

function fail(message) {
  process.stderr.write(`mcp-launch: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const keepIdx = argv.indexOf("--keep");
  const dash = argv.indexOf("--");
  if (keepIdx < 0 || dash < 0 || dash !== keepIdx + 2 || dash >= argv.length - 1) {
    fail("usage: node mcp-launch.cjs --keep NAME[,NAME...] -- <cmd> [args...]");
  }
  const keep = argv[keepIdx + 1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (keep.length === 0) fail("--keep needs at least one name");
  for (const name of keep) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) fail(`refusing keep name ${name}`);
  }
  return { keep, command: argv[dash + 1], args: argv.slice(dash + 2) };
}

function childEnv(keep) {
  const env = {};
  for (const name of keep) {
    if (process.env[name] != null) env[name] = process.env[name];
  }
  return env;
}

function main() {
  const { keep, command, args } = parseArgs(process.argv.slice(2));
  const child = spawn(command, args, { env: childEnv(keep), stdio: "inherit" });
  const forward = (signal) => {
    if (!child.pid) return;
    try {
      child.kill(signal);
    } catch {
      /* child already exited */
    }
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => forward(signal));
  }
  child.on("error", (err) => fail(err.message));
  child.on("exit", (code, signal) => {
    if (signal) {
      process.removeAllListeners(signal);
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code == null ? 1 : code);
  });
}

main();
