#!/usr/bin/env node

/**
 * StringRay Grok CLI E2E Integration Test (Consumer Validation)
 *
 * This test is designed to be run AFTER the package has been installed
 * into a consumer directory (via the unified runner or manually with --dir).
 *
 * It validates that the Grok plugin was properly installed and is ready
 * for Grok CLI to discover (hooks, MCP servers, etc.).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const KEEP = process.argv.includes('--keep');
const DIR_FLAG = process.argv.indexOf('--dir');
const CUSTOM_DIR = DIR_FLAG !== -1 && process.argv[DIR_FLAG + 1] ? process.argv[DIR_FLAG + 1] : null;

const TARBALL_FLAG = process.argv.indexOf('--tarball');
const TARBALL_PATH = TARBALL_FLAG !== -1 && process.argv[TARBALL_FLAG + 1] ? process.argv[TARBALL_FLAG + 1] : null;

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(name) {
  passed++;
  console.log(`  \x1b[32mPASS\x1b[0m: ${name}`);
}

function fail(name, reason) {
  failed++;
  console.log(`  \x1b[31mFAIL\x1b[0m: ${name} — ${reason}`);
}

function skip(name, reason) {
  skipped++;
  console.log(`  \x1b[33mSKIP\x1b[0m: ${name} — ${reason}`);
}

function section(title) {
  console.log(`\n\x1b[1m${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}\x1b[0m`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...opts });
  } catch (error) {
    if (opts.ignoreError) return '';
    throw error;
  }
}

function assertFileExists(filePath, name) {
  if (fs.existsSync(filePath)) {
    pass(`${name} exists`);
    return true;
  } else {
    fail(name, `not found at ${filePath}`);
    return false;
  }
}

function assertJsonValid(filePath, name) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    pass(`${name} is valid JSON`);
    return true;
  } catch (e) {
    fail(name, `invalid JSON: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('\x1b[1mStringRay Grok CLI E2E Test (Consumer Validation)\x1b[0m\n');

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

  // Determine test directory (consumer install location)
  let testDir;
  if (CUSTOM_DIR) {
    testDir = CUSTOM_DIR;
    pass('Using provided consumer directory');
  } else {
    testDir = path.join(os.tmpdir(), `grok-strray-e2e-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    pass('Created temporary consumer directory');

    // If tarball provided, install it (for standalone runs)
    if (TARBALL_PATH) {
      run('git init', { cwd: testDir });
      run('npm init -y', { cwd: testDir });
      const installOut = run(`npm install "${TARBALL_PATH}"`, { cwd: testDir, timeout: 120000 });
      if (fs.existsSync(path.join(testDir, 'node_modules', 'strray-ai', 'package.json'))) {
        pass('Installed strray-ai from local tarball');
      } else {
        fail('Installation', 'Could not install from tarball');
        process.exit(1);
      }
    } else {
      skip('Installation', 'No --dir or --tarball provided. Assuming existing installation.');
    }
  }

  const nodeModulesStrray = path.join(testDir, 'node_modules', 'strray-ai');

  if (!fs.existsSync(nodeModulesStrray)) {
    fail('strray-ai installation', `not found in ${testDir}`);
    console.log('Run with --dir <consumer-dir> or let the unified runner set it up.');
    process.exit(1);
  }

  // ── Phase 1: Verify Grok Plugin Installation ────────────
  section('Phase 1: Verify Grok Plugin Installation');

  // Grok plugin is copied to the consumer *project root* .grok/plugins/strray-ai/
  // (exactly like .opencode/ for OpenCode parity). Not inside node_modules.
  const grokPluginDir = path.join(testDir, '.grok', 'plugins', 'strray-ai');

  const hooksJson = path.join(grokPluginDir, 'hooks', 'hooks.json');
  const mcpJson = path.join(grokPluginDir, '.mcp.json');

  assertFileExists(grokPluginDir, 'Grok plugin directory (.grok/plugins/strray-ai)');
  assertFileExists(hooksJson, 'hooks/hooks.json');
  assertFileExists(mcpJson, '.mcp.json');

  // Validate JSON files
  assertJsonValid(hooksJson, 'hooks.json');
  assertJsonValid(mcpJson, '.mcp.json');

  // Check that hooks.json has expected events for governance
  try {
    const hooks = JSON.parse(fs.readFileSync(hooksJson, 'utf8'));
    if (hooks.hooks && hooks.hooks.PreToolUse) {
      pass('PreToolUse hook defined for governance enforcement');
    } else {
      fail('PreToolUse hook', 'not found in hooks.json');
    }
  } catch (e) {
    fail('hooks.json parsing', e.message);
  }

  // Check .mcp.json has expected servers
  try {
    const mcp = JSON.parse(fs.readFileSync(mcpJson, 'utf8'));
    const servers = mcp.mcpServers || {};
    if (servers['strray-governance']) {
      pass('strray-governance MCP server registered');
    } else {
      fail('strray-governance MCP server', 'not found in .mcp.json');
    }
  } catch (e) {
    fail('.mcp.json parsing', e.message);
  }

  // ── Phase 2: Grok CLI Binary Check ──────────────────────
  section('Phase 2: Grok CLI Availability');

  let grokBin;
  try {
    grokBin = execSync('which grok || which grok-cli || echo "not-found"', { encoding: 'utf-8' }).trim();
    if (grokBin === 'not-found') {
      skip('Grok CLI binary', 'grok/grok-cli not found in PATH (expected in many CI environments)');
    } else {
      pass(`Grok CLI found at ${grokBin}`);
    }
  } catch {
    skip('Grok CLI binary', 'could not detect');
  }

  // ── Phase 3: Governance Integration Smoke Test ──────────
  section('Phase 3: Governance Integration Smoke Test');

  // Verify that the governance service is present in the installed package
  const govService = path.join(nodeModulesStrray, 'dist', 'governance', 'governance-service.js');
  if (assertFileExists(govService, 'GovernanceService (core governance logic)')) {
    pass('GovernanceService is available for Grok integration');
  }

  const researcherSkill = path.join(nodeModulesStrray, 'dist', 'skills', 'researcher');
  if (fs.existsSync(researcherSkill)) {
    pass('Researcher skill is packaged for Grok');
  }

  // ── Cleanup ─────────────────────────────────────────────
  if (!KEEP && !CUSTOM_DIR) {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log(`  Cleaned up ${testDir}`);
    } catch {}
  }

  console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed, ${skipped} skipped\x1b[0m\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err);
  process.exit(1);
});
